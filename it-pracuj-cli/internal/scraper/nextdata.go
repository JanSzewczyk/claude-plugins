// Copyright 2026 janszewczyk. Licensed under Apache-2.0. See LICENSE.

// Package scraper fetches job listings from it.pracuj.pl by parsing the
// __NEXT_DATA__ JSON embedded in the server-rendered HTML.
// No JSON API endpoint exists for listings — the data is inlined by Next.js.
package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const listingBaseURL = "https://it.pracuj.pl"

// SubOffer holds per-location data for a grouped offer.
type SubOffer struct {
	PartitionID      int    `json:"partitionId"`
	DisplayWorkplace string `json:"displayWorkplace"`
	OfferAbsoluteUri string `json:"offerAbsoluteUri"`
	IsWholePoland    bool   `json:"isWholePoland"`
}

// OfferGroup is one card on the pracuj.pl listing page.
// Multiple Sub-Offers appear when the same role is posted for several locations.
type OfferGroup struct {
	Technologies      []string   `json:"technologies"`
	GroupID           string     `json:"groupId"`
	JobTitle          string     `json:"jobTitle"`
	CompanyName       string     `json:"companyName"`
	SalaryDisplayText string     `json:"salaryDisplayText"`
	JobDescription    string     `json:"jobDescription"`
	LastPublicated    string     `json:"lastPublicated"`
	IsRemoteWorkAllowed bool     `json:"isRemoteWorkAllowed"`
	WorkModes         []string   `json:"workModes"`
	TypesOfContract   []string   `json:"typesOfContract"`
	PositionLevels    []string   `json:"positionLevels"`
	WorkSchedules     []string   `json:"workSchedules"`
	AiSummary         string     `json:"aiSummary"`
	Offers            []SubOffer `json:"offers"`
}

// ListingResult is the parsed result of one listing page.
type ListingResult struct {
	Offers     []OfferGroup
	TotalCount int
	Page       int
	PerPage    int
}

// SearchParams controls which offers to fetch.
type SearchParams struct {
	Keyword          string
	City             string // embedded as /[city];wp path segment — server-side city filter
	Radius           int    // rd=N, search radius in km around City
	Page             int
	PerPage          int
	WorkMode         string // single or comma-separated: "home-office,hybrid"
	EmploymentType   string // et: 1=UoP, 4=B2B, 5=internship
	TechCategory     string // tc: numeric category ID (legacy, prefer ITSpecialization)
	ITSpecialization string // its: frontend, backend, devops, mobile, data, testing, architecture
	ITTechnologies   string // itth: comma-separated numeric tech IDs, e.g. "76,33,34"
}

type nextDataRoot struct {
	Props struct {
		PageProps struct {
			DehydratedState struct {
				Queries []struct {
					QueryKey json.RawMessage `json:"queryKey"`
					State    struct {
						Data json.RawMessage `json:"data"`
					} `json:"state"`
				} `json:"queries"`
			} `json:"dehydratedState"`
		} `json:"pageProps"`
	} `json:"props"`
}

type jobOffersData struct {
	GroupedOffers    []OfferGroup `json:"groupedOffers"`
	OffersTotalCount int          `json:"offersTotalCount"`
}

// FetchOffers retrieves one page of job listings for the given search params.
func FetchOffers(params SearchParams, timeout time.Duration) (*ListingResult, error) {
	if params.Keyword == "" {
		return nil, fmt.Errorf("--keyword is required for listing offers")
	}
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PerPage <= 0 {
		params.PerPage = 50
	}

	// City is a path segment: /praca/[kw];kw/[city];wp
	// Without city: /praca/[kw];kw
	path := "/praca/" + url.PathEscape(params.Keyword) + ";kw"
	if params.City != "" {
		path += "/" + url.PathEscape(params.City) + ";wp"
	}
	rawURL := listingBaseURL + path
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("building request: %w", err)
	}

	q := req.URL.Query()
	q.Set("pn", fmt.Sprintf("%d", params.Page))
	q.Set("rop", fmt.Sprintf("%d", params.PerPage))
	if params.WorkMode != "" {
		q.Set("wm", params.WorkMode)
	}
	if params.EmploymentType != "" {
		q.Set("et", params.EmploymentType)
	}
	if params.TechCategory != "" {
		q.Set("tc", params.TechCategory)
	}
	if params.ITSpecialization != "" {
		q.Set("its", params.ITSpecialization)
	}
	if params.ITTechnologies != "" {
		q.Set("itth", params.ITTechnologies)
	}
	if params.Radius > 0 {
		q.Set("rd", fmt.Sprintf("%d", params.Radius))
	}
	req.URL.RawQuery = q.Encode()

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "pl-PL,pl;q=0.9,en;q=0.8")

	httpClient := &http.Client{Timeout: timeout}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching %s: %w", rawURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("it.pracuj.pl returned HTTP %d (Cloudflare may be blocking this request — try again)", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response body: %w", err)
	}

	jsonData, err := extractNextData(string(body))
	if err != nil {
		return nil, err
	}

	var page nextDataRoot
	if err := json.Unmarshal(jsonData, &page); err != nil {
		return nil, fmt.Errorf("parsing __NEXT_DATA__: %w", err)
	}

	for _, qry := range page.Props.PageProps.DehydratedState.Queries {
		// QueryKey is a JSON array; first element is the query name string.
		var key []json.RawMessage
		if err := json.Unmarshal(qry.QueryKey, &key); err != nil || len(key) == 0 {
			continue
		}
		var name string
		if err := json.Unmarshal(key[0], &name); err != nil {
			continue
		}
		if name == "jobOffers" {
			var d jobOffersData
			if err := json.Unmarshal(qry.State.Data, &d); err != nil {
				return nil, fmt.Errorf("parsing jobOffers data: %w", err)
			}
			return &ListingResult{
				Offers:     d.GroupedOffers,
				TotalCount: d.OffersTotalCount,
				Page:       params.Page,
				PerPage:    params.PerPage,
			}, nil
		}
	}

	return nil, fmt.Errorf("jobOffers query not found in __NEXT_DATA__ — pracuj.pl page structure may have changed")
}

func extractNextData(html string) ([]byte, error) {
	const marker = `<script id="__NEXT_DATA__"`
	idx := strings.Index(html, marker)
	if idx < 0 {
		if strings.Contains(html, "cf-browser-verification") || strings.Contains(html, "challenge-platform") {
			return nil, fmt.Errorf("Cloudflare challenge page returned — try again in a few seconds")
		}
		return nil, fmt.Errorf("__NEXT_DATA__ not found in response HTML")
	}
	rest := html[idx+len(marker):]
	gt := strings.Index(rest, ">")
	if gt < 0 {
		return nil, fmt.Errorf("malformed __NEXT_DATA__ script tag")
	}
	content := rest[gt+1:]
	end := strings.Index(content, "</script>")
	if end < 0 {
		return nil, fmt.Errorf("__NEXT_DATA__ script tag not closed")
	}
	return []byte(strings.TrimSpace(content[:end])), nil
}
