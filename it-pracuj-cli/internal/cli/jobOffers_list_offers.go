// Copyright 2026 janszewczyk. Licensed under Apache-2.0. See LICENSE.

package cli

import (
	"encoding/json"
	"fmt"
	"strings"
	"text/tabwriter"

	"github.com/spf13/cobra"
	"it-pracuj-pl/internal/scraper"
)

func newJobOffersListOffersCmd(flags *rootFlags) *cobra.Command {
	var flagKw string
	var flagPn int
	var flagRop int
	var flagCity string
	var flagRadius int
	var flagWm string
	var flagEt string
	var flagTc string
	var flagITS string
	var flagITTH string

	cmd := &cobra.Command{
		Use:   "list-offers",
		Short: "List job offers matching search criteria (scrapes it.pracuj.pl)",
		Long: `List job offers matching search criteria.

Fetches the pracuj.pl listing page and extracts structured offer data from the
embedded Next.js page cache. No JSON API endpoint exists for listings — the page
is server-side rendered.

Filters:
  --city           City name, e.g. kraków, warszawa (sets /city;wp URL path segment)
  --radius         Search radius in km from city (use with --city)
  --work-mode      One or more work modes, comma-separated: home-office,hybrid,full-office
  --it-spec        IT specialization: frontend, backend, devops, mobile, data, testing, architecture
  --it-tech        IT technology IDs, comma-separated: 76,33,34,42
  --employment-type Employment type: 1=UoP, 4=B2B, 5=internship

Cloudflare note: if you receive a 403 error, wait a few seconds and retry.`,
		Example: `  it-pracuj-pl job-offers list-offers --keyword react --city kraków
  it-pracuj-pl job-offers list-offers --keyword frontend --city kraków --radius 50 --it-spec frontend
  it-pracuj-pl job-offers list-offers --keyword react --work-mode home-office,hybrid --employment-type 4
  it-pracuj-pl job-offers list-offers --keyword react --it-spec frontend --it-tech 76,33,34 --json`,
		Annotations: map[string]string{"mcp:read-only": "true"},
		RunE: func(cmd *cobra.Command, args []string) error {
			if flagKw == "" {
				return usageErr(fmt.Errorf("--keyword is required"))
			}

			page := flagPn
			if page <= 0 {
				page = 1
			}
			perPage := flagRop
			if perPage <= 0 {
				perPage = 50
			}

			result, err := scraper.FetchOffers(scraper.SearchParams{
				Keyword:          flagKw,
				City:             flagCity,
				Radius:           flagRadius,
				Page:             page,
				PerPage:          perPage,
				WorkMode:         flagWm,
				EmploymentType:   flagEt,
				TechCategory:     flagTc,
				ITSpecialization: flagITS,
				ITTechnologies:   flagITTH,
			}, flags.timeout)
			if err != nil {
				return err
			}

			if flags.asJSON || (!isTerminal(cmd.OutOrStdout()) && !flags.csv && !flags.quiet && !flags.plain) {
				out, jsonErr := json.Marshal(result.Offers)
				if jsonErr != nil {
					return jsonErr
				}
				return printOutput(cmd.OutOrStdout(), out, true)
			}

			if flags.csv {
				fmt.Fprintln(cmd.OutOrStdout(), "title,company,salary,work_mode,location,url")
				for _, g := range result.Offers {
					loc, link := offerLocation(g)
					fmt.Fprintf(cmd.OutOrStdout(), "%q,%q,%q,%q,%q,%q\n",
						g.JobTitle,
						g.CompanyName,
						g.SalaryDisplayText,
						strings.Join(g.WorkModes, "|"),
						loc,
						link,
					)
				}
				return nil
			}

			tw := tabwriter.NewWriter(cmd.OutOrStdout(), 2, 4, 2, ' ', 0)
			totalPages := (result.TotalCount + perPage - 1) / perPage
			location := flagCity
			if location == "" {
				location = "cała Polska"
			}
			fmt.Fprintf(tw, "Oferty pracuj.pl: %q, %s — strona %d z %d (%d łącznie)\n\n",
				flagKw, location, result.Page, totalPages, result.TotalCount)
			fmt.Fprintf(tw, "TYTUŁ\tFIRMA\tWYNAGRODZENIE\tTRYB PRACY\tLOKALIZACJA\n")
			fmt.Fprintf(tw, "-----\t-----\t-----------\t----------\t----------\n")
			for _, g := range result.Offers {
				loc, _ := offerLocation(g)
				salary := g.SalaryDisplayText
				if salary == "" {
					salary = "–"
				}
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\n",
					truncate(g.JobTitle, 42),
					truncate(g.CompanyName, 28),
					truncate(salary, 22),
					strings.Join(g.WorkModes, "/"),
					loc,
				)
			}
			if result.TotalCount > len(result.Offers) {
				fmt.Fprintf(tw, "\n%d ofert na stronie. Kolejna: --page %d\n",
					len(result.Offers), result.Page+1)
			}
			return tw.Flush()
		},
	}

	cmd.Flags().StringVar(&flagKw, "keyword", "", "Search keyword, e.g. 'react', 'java developer' (required)")
	cmd.Flags().StringVar(&flagKw, "kw", "", "Search keyword (alias)")
	_ = cmd.Flags().MarkHidden("kw")
	cmd.Flags().StringVar(&flagCity, "city", "", "City filter: kraków, warszawa, wrocław, gdańsk, poznań…")
	cmd.Flags().IntVar(&flagRadius, "radius", 0, "Search radius in km around city (use with --city)")
	cmd.Flags().IntVar(&flagPn, "page", 0, "Page number (default: 1)")
	cmd.Flags().IntVar(&flagPn, "pn", 0, "Page number (alias)")
	_ = cmd.Flags().MarkHidden("pn")
	cmd.Flags().IntVar(&flagRop, "per-page", 0, "Results per page (default: 50, max: 50)")
	cmd.Flags().IntVar(&flagRop, "rop", 0, "Results per page (alias)")
	_ = cmd.Flags().MarkHidden("rop")
	cmd.Flags().StringVar(&flagWm, "work-mode", "", "Work mode (comma-separated): home-office, hybrid, full-office")
	cmd.Flags().StringVar(&flagWm, "wm", "", "Work mode (alias)")
	_ = cmd.Flags().MarkHidden("wm")
	cmd.Flags().StringVar(&flagEt, "employment-type", "", "Employment type: 1=UoP, 4=B2B, 5=internship")
	cmd.Flags().StringVar(&flagEt, "et", "", "Employment type (alias)")
	_ = cmd.Flags().MarkHidden("et")
	cmd.Flags().StringVar(&flagTc, "tech-category", "", "Tech category ID: 1=backend, 2=devops, 3=frontend, 4=mobile, 5=data, 6=QA, 7=architecture")
	cmd.Flags().StringVar(&flagTc, "tc", "", "Tech category (alias)")
	_ = cmd.Flags().MarkHidden("tc")
	cmd.Flags().StringVar(&flagITS, "it-spec", "", "IT specialization: frontend, backend, devops, mobile, data, testing, architecture")
	cmd.Flags().StringVar(&flagITS, "its", "", "IT specialization (alias)")
	_ = cmd.Flags().MarkHidden("its")
	cmd.Flags().StringVar(&flagITTH, "it-tech", "", "IT technology IDs, comma-separated (e.g. 76,33,34,42)")
	cmd.Flags().StringVar(&flagITTH, "itth", "", "IT technology IDs (alias)")
	_ = cmd.Flags().MarkHidden("itth")

	return cmd
}

func offerLocation(g scraper.OfferGroup) (location, link string) {
	if len(g.Offers) == 0 {
		return "", ""
	}
	o := g.Offers[0]
	loc := o.DisplayWorkplace
	if o.IsWholePoland && loc == "" {
		loc = "Cała Polska"
	}
	return loc, o.OfferAbsoluteUri
}
