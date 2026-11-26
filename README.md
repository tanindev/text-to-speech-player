# Text-to-Speech-Player

> Modern, lightweight (<15 KB), and accessible Text-to-Speech audio reader for WordPress with real-time synchronized read-along highlighting, auto-docking player, phonetic pronunciation dictionary, and Bring-Your-Own-Key (BYOK) AI integrations.

[![WordPress](https://img.shields.io/badge/WordPress-5.8+-blue.svg)](https://wordpress.org/)
[![PHP](https://img.shields.io/badge/PHP-7.4+-777bb4.svg)](https://www.php.net/)
[![License: GPL v2+](https://img.shields.io/badge/License-GPL%20v2+-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

---

## 🌟 Features

* **Zero-Cost Browser Speech Engine**: Uses your visitor's built-in browser speech synthesis (`window.speechSynthesis`) with 20–300+ natural voices. No account, no API key, and zero cloud hosting charges.
* **Modern Floating Player Bar**: Sleek audio player with play/pause controls, dynamic sound wave animation, speed selector (0.8x–2.0x), and auto-docking when visitors scroll down your page.
* **Read-Along Synchronized Highlighting**: Lights up words and sentences in real-time as they are spoken, complete with smooth viewport auto-scrolling and radial forward-drift recovery.
* **Phonetic Pronunciation Dictionary (Aliases)**: Map abbreviations, technical terms, and acronyms to clear spoken phrases (e.g. read "WP" as "WordPress" or "5k" as "5 thousand").
* **Smart Content Extractor**: Automatically strips HTML tags, raw shortcodes, URLs, and code blocks before speaking to ensure pristine audio.
* **Bring-Your-Own-Key (BYOK) AI**: Connect OpenAI (ChatGPT `tts-1` & `tts-1-hd`), ElevenLabs, Google Cloud TTS, Amazon Polly, or self-hosted custom endpoints.
* **Audio SEO (Google Rich Results)**: Automatically injects structured `AudioObject` JSON-LD schema into your pages.
* **Gutenberg & WooCommerce Ready**: Place the player anywhere using Gutenberg blocks, shortcodes (`[tts_player]`), or automated `the_content` injection.

---

## 🚀 Quick Start

1. Clone or download this repository into your `/wp-content/plugins/` directory:
   ```bash
   cd wp-content/plugins/
   git clone git@github.com-personal:techtanin/Text-to-Speech-Player.git text-to-speech-player
   ```
2. Activate the plugin via **WordPress Admin > Plugins**.
3. Configure your player appearance and default voices under **Text to Speech > Settings**.

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development compiler with hot-reloading
npm start

# Build production assets
npm run build

# Build production-ready distribution zip
npm run build:prod
```

---

## 📄 License

This project is licensed under the [GNU General Public License v2.0 or later](https://www.gnu.org/licenses/gpl-2.0.html).
