# Template: mobile-app

For: React Native, Expo, Flutter, or any iOS/Android app project.

## Required metadata

- Standard set (see web-app.md)
- `{{platforms}}` — iOS, Android, or both
- `{{rn_framework}}` — Expo / bare React Native / Flutter
- `{{build_system}}` — EAS Build / Fastlane / Xcode Cloud / native

## Ask the user if missing

- Target platforms if not clear from `app.json` / `ios`+`android` folders
- App Store / Play Store URLs (if published)
- Screenshots URL or path

## Template

````markdown
<div align="center">

# 📱 {{title}}

[![Expo](https://img.shields.io/badge/Expo-1B1F23?logo=expo&logoColor=white)](https://expo.dev/)
[![iOS](https://img.shields.io/badge/iOS-000000?logo=apple&logoColor=white)](#)
[![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)](#)
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Features](#-features) • [Getting Started](#-getting-started) • [Build](#-build) • [Documentation](#-table-of-contents)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

{{screenshots_block}}

## ✨ Features

### 🏗️ Core Stack

{{core_tech_list}}

### 📱 Platform Support

{{platform_list}}

### 🧪 Testing & Quality

{{testing_list}}

### 🔧 Developer Experience

{{dx_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🎯 Getting Started](#-getting-started)
- [🛠️ Development](#-development)
- [📦 Build](#-build)
- [🚀 Deployment](#-deployment)
- [📃 Scripts Overview](#-scripts-overview)
- [🧪 Testing](#-testing)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 🎯 Getting Started

### 📋 Prerequisites

- **Node.js** (version {{node_version}} or higher)
- **{{package_manager}}** package manager
- **Expo CLI** — installed automatically via npx
- **Xcode** (for iOS development on macOS)
- **Android Studio** (for Android development)
- **Git** for version control

### 📦 Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/{{owner}}/{{repo}}.git
cd {{repo}}
```

#### 2. Install Dependencies

```bash
{{install_cmd}}
```

#### 3. Start the App

```bash
npx expo start
```

Then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan the QR code with **Expo Go** to run on a physical device

---

## 🛠️ Development

{{development_section}}

---

## 📦 Build

{{build_section}}

For production builds with EAS:

```bash
eas build --platform ios
eas build --platform android
eas build --platform all
```

---

## 🚀 Deployment

{{deployment_section}}

---

## 📃 Scripts Overview

{{scripts_grouped}}

---

## 🧪 Testing

{{testing_section}}

---

## 📁 Project Structure

```
{{project_tree}}
```

### Key Directories

{{key_directories}}

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **{{license}} License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

{{acknowledgments}}

---

## 📧 Contact & Support

- 🐛 [Open an issue](https://github.com/{{owner}}/{{repo}}/issues)
- ⭐ [Star this repository](https://github.com/{{owner}}/{{repo}})
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/{{owner}})

---

<div align="center">

**Made with ❤️ by [{{author}}](https://github.com/{{owner}})**

If this app helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-{{title_slug}})

</div>
````
