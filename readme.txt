=== Text to Speech Player – AI TTS & Audio Reader ===
Contributors: tanindev
Tags: text to speech, tts, audio player, speech synthesis, accessibility
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Lightweight text-to-speech audio player for WordPress with synchronized read-along highlighting, auto-docking bar, and Bring-Your-Own-Key AI.

== Description ==

**Text to Speech Player** is a modern, lightweight (<15 KB runtime), and accessible audio reader for WordPress. Instantly convert articles, blog posts, pages, and WooCommerce products into natural-sounding speech with zero API cost using your visitors' built-in browser speech synthesis, or connect your own AI keys (OpenAI, ElevenLabs, Google Cloud TTS, Amazon Polly).

Increase visitor dwell time, reduce bounce rates, boost accessibility compliance (ADA / WCAG), and allow your audience to listen on the go while doing other tasks.

### 🌟 Why Choose Text to Speech Player?

* **Zero API Cost & 100% Free Forever**: Runs on the native Web Speech API (`window.speechSynthesis`) available in all modern browsers (Chrome, Safari, Edge, Firefox, iOS, Android). No monthly subscriptions, no server costs, and no API keys required.
* **Interactive Progress Scrubber & Seek Bar**: Beautiful, responsive audio progress track allowing readers to jump or scrub to any point in the narration, complete with quick -10s rewind and +10s fast-forward buttons.
* **Lock-Screen & Bluetooth MediaSession API**: Full integration with `navigator.mediaSession`! Mobile listeners can control playback, pause, and see the article title and featured artwork right from their lock screen, notification shade, Apple Watch, or car display.
* **Estimated Listening Time Badge**: Automatically calculates and displays a sleek reading/listening time pill (e.g., `🎧 3 min listen`) beside the audio button.
* **Synchronized Read-Along Highlighting**: Highlights active words and sentences in real-time as they are spoken, complete with soft focus dimming and smooth auto-scrolling that keeps the active text in view.
* **Flexible Player Placement (Inline or Fixed Sticky)**: Place the player before post content, after post content, or choose **Sticky** to anchor the floating player permanently at any screen corner or edge (Bottom Right, Bottom Left, Top Right, Top Left, Bottom Center, Top Center, Middle Left, Middle Right) with custom pixel offsets (X and Y coordinates).
* **Auto-Docking Floating Bar**: The audio player stays accessible at the bottom of the screen as readers scroll down the article, complete with play/pause, time tracker, and speed controls.
* **Theme Container Auto-Detection**: Zero-configuration theme presets for Astra, GeneratePress, Kadence, Twenty Twenty-Four, Elementor, Divi, and standard WordPress block themes.
* **Full Keyboard Accessibility (WCAG 2.1)**: Control audio playback via Spacebar or `K` (play/pause), Left/Right arrow keys or `J`/`L` (seek 10s), with ARIA live region status announcements.
* **Web Speech Keep-Alive Heartbeat**: Prevents the known Chromium browser freeze bug on long articles (>15 seconds), delivering uninterrupted, continuous speech playback.
* **Phonetic Pronunciation Dictionary (Aliases)**: Fix awkward machine pronunciation with custom phonetic rules (e.g., read "WP" as "WordPress", "SEO" as "Search Engine Optimization", or "5k" as "5 thousand").
* **Smart Content Extractor**: Automatically strips HTML tags, raw bracket shortcodes (like `[gallery]`), code blocks, scripts, raw URLs, and navigation links before speaking to ensure clean, natural speech.
* **Bring-Your-Own-Key (BYOK) AI Integration**: Optional support for hyper-realistic neural AI voices via OpenAI (`tts-1` & `tts-1-hd`), ElevenLabs (Prime Voice AI & Turbo v2.5), Google Cloud TTS, Amazon Polly, or self-hosted custom endpoints.
* **Text Selection Reader**: Visitors can highlight any sentence or paragraph on your page to reveal an instant "Listen" popover button.
* **Pre-Recorded Audio & MP3 Downloads**: Attach your own custom `.mp3` audio files to any post to use recorded narration instead of synthesized speech, with an optional one-click download button.
* **Multilingual & Locale Detection**: Automatically detects post language (native WP locale, Polylang, WPML, TranslatePress) and assigns matching native regional voices.
* **SEO & Google Rich Results**: Automatically injects structured `AudioObject` schema (JSON-LD) into pages so search engines index your spoken content.
* **Zero Bloat (<16 KB Runtime)**: Vanilla JavaScript with zero external runtime dependencies. Lightning-fast Core Web Vitals (CWV) and 100% page speed score friendly.

---

### 🎨 Fully Customizable Appearance

Choose from 5 modern player themes, custom accent colors, button radius, and sizes to seamlessly match your site branding:

* **5 Design Themes**: Modern Light (Clean SaaS), Dark Glass (Glassmorphism), Solid Fill, Minimalist Outline, and Soft Tint.
* **Border Radius Styles**: Pill (Fully Rounded), Rounded Large (16px), Rounded Medium (8px), Sharp (4px), and Square (0px).
* **3 Size Variants**: Small, Medium, and Large.
* **Custom Accent Colors**: Pick any brand hex color or select from designer preset palettes.
* **Icon-Only or Text Labels**: Customize multi-state labels ("Listen to this article", "Pause", "Resume", "Listen again") or leave label empty for a compact icon-only player button.
* **3 Highlighting Modes**: Word-only highlight, Sentence-only background tint, or Dual (Word + Sentence background).

---

### 💻 Shortcode & Template Usage

Place a custom play button anywhere on your site (homepage, hero sections, widgets, landing pages, or theme templates):

#### 1. Standard Player (Current Post/Page)
Converts and plays the current post or page content:
`[tts_player]`

#### 2. Custom Spoken Text (Hero Section / Greeting)
Speaks custom text instead of the page content:
`[tts_player text="Welcome to our website! Listen to our quick audio introduction."]`

#### 3. Custom Labels & Styling Override
`[tts_player theme="solid" accent="#e11d48" radius="pill" size="large" listen_text="Listen to Audio Intro"]`

#### 4. Custom MP3 Audio File Player
Plays pre-recorded audio or podcast file:
`[tts_player audio_url="https://example.com/audio.mp3" listen_text="Play Podcast Episode"]`

#### 5. Enclosed Text Block
Wrap any specific paragraph or text inside shortcode tags:
`[tts_player]This exact text inside the shortcode will be spoken aloud.[/tts_player]`

#### 6. Specific Post Content
Play audio for another specific post by ID:
`[tts_player id="42"]`

#### 7. Sticky Fixed Floating Player
Anchor a floating audio player to any screen corner with custom horizontal (X) and vertical (Y) offsets:
`[tts_player position="sticky" sticky_position="bottom_right" offset_x="24" offset_y="24"]`

#### 8. PHP Theme Template Integration
Directly embed in `front-page.php`, `header.php`, or single post templates:
`<?php echo do_shortcode( '[tts_player]' ); ?>`

---

### 🔒 Privacy & GDPR Compliance

Text to Speech Player is built with privacy-by-design:
* The default browser speech engine executes 100% locally on your visitor's device. No text or personal data is transmitted to external servers.
* Anonymous listening analytics (play counts and listening duration) are stored strictly inside your WordPress database. Zero external telemetry or tracking scripts.
* Optional Cloud AI providers only receive the text you explicitly send for synthesis when you configure your own API keys.

== External Services ==

This plugin uses your visitor's built-in browser Web Speech API by default and does not connect to any external service unless an administrator explicitly configures a Bring-Your-Own-Key (BYOK) Cloud AI provider in **Text to Speech > Settings**. When configured and triggered from the admin settings, the plugin sends the text to be synthesized and your configured voice/model parameters to the selected provider:

* **OpenAI Text-to-Speech API** (`https://api.openai.com/v1/audio/speech`): Used only when OpenAI is selected and an OpenAI API key is configured.
  * Terms of Service: https://openai.com/policies/terms-of-use
  * Privacy Policy: https://openai.com/policies/privacy-policy
* **ElevenLabs Text-to-Speech API** (`https://api.elevenlabs.io/v1/text-to-speech/`): Used only when ElevenLabs is selected and an ElevenLabs API key is configured.
  * Terms of Service: https://elevenlabs.io/terms-of-use
  * Privacy Policy: https://elevenlabs.io/privacy-policy
* **Google Cloud Text-to-Speech API** (`https://texttospeech.googleapis.com/v1/text:synthesize`): Used only when Google Cloud TTS is selected and a Google Cloud API key is configured.
  * Terms of Service: https://cloud.google.com/terms
  * Privacy Policy: https://policies.google.com/privacy
* **Amazon Polly API** (`https://polly.{region}.amazonaws.com/v1/speech`): Used only when Amazon Polly is selected and AWS Access/Secret keys are configured.
  * Terms of Service: https://aws.amazon.com/service-terms/
  * Privacy Policy: https://aws.amazon.com/privacy/
* **Custom / Self-Hosted AI Endpoint**: Used only when a custom endpoint URL is explicitly configured by the site administrator. Data is sent only to the URL you specify.

== Source Code ==

The unminified source code (`src/`), build configuration (`webpack.config.js`, `package.json`), and development history for this plugin are publicly available on GitHub:
https://github.com/tanindev/text-to-speech-player

== Installation ==

### Automatic Installation (Recommended)
1. In your WordPress admin dashboard, go to **Plugins > Add New**.
2. Search for `Text to Speech Player`.
3. Click **Install Now**, then click **Activate**.
4. Go to **Text to Speech > Settings** to configure your player appearance and default voice.

### Manual Installation
1. Download the `text-to-speech-player.zip` archive.
2. Unzip and upload the `text-to-speech-player` directory to `/wp-content/plugins/`.
3. Activate the plugin through the **Plugins** menu in WordPress.

== Frequently Asked Questions ==

= Does this plugin require paid API keys? =
No. The default speech engine runs entirely in your visitor's web browser using the standard Web Speech API at zero cost. It requires no subscription, no credit card, and zero cloud API keys. Cloud AI providers (OpenAI, ElevenLabs, Google Cloud) are completely optional for users who want neural voices.

= How do I prevent the player from showing on my homepage? =
Go to **Text to Speech > Settings > General** and turn on **"Disable Player on Front Page / Home Page"**. You can also disable the player on any specific post or page using the "Text to Speech Player" metabox in the editor sidebar.

= How do I place the audio player on a specific place on the page? =
Set **Player Position** to **"Manual (Shortcode / Block Only)"** in **Text to Speech > Settings > General**. Then insert the `[tts_player]` shortcode or block exactly where you want the player to appear.

= Can I customize the player colors and style? =
Yes. Under **Text to Speech > Settings > Appearance**, you can choose between 5 color themes (Modern Light, Dark Glass, Solid, Outline, Soft Tint), customize the accent color with a live color picker, adjust border radius, change button sizes, and configure real-time word highlighting colors.

= Does the plugin support multilingual websites? =
Yes. The plugin automatically detects the language of the current post (compatible with native WordPress locales, Polylang, WPML, and TranslatePress) and selects matching native voices in that language.

= Can I upload pre-recorded MP3 voiceovers instead of speech synthesis? =
Yes. When editing any post or page, look for the **"Text to Speech Player"** sidebar panel and paste the URL of your uploaded MP3 file into the **"Custom MP3 Audio URL"** field. The player will stream your MP3 file instead of synthesizing speech.

= How does the synchronized read-along highlighting work? =
As the audio plays, the player synchronizes with speech boundaries in real time, highlighting the current word in yellow and the active sentence with a soft background tint, while gently auto-scrolling to keep the reading position centered in the viewport.

= Can I add custom pronunciation for abbreviations and acronyms? =
Yes! Navigate to **Text to Speech > Settings > Pronunciation (Aliases)**. You can add phonetic rules such as reading "WP" as "WordPress", "SEO" as "Search Engine Optimization", or "COVID-19" as "Covid nineteen".

= Is the player mobile-friendly? =
Yes. The audio player and sticky floating dock are fully responsive and touch-optimized for iOS, iPadOS, Android smartphones, and tablets.

= Does it affect my website loading speed? =
No. The frontend runtime JavaScript is under 15 KB with zero third-party script dependencies. Assets are loaded asynchronously and do not block page rendering.

== Screenshots ==

1. Modern floating audio player with animated soundwaves and speed selector on blog post.
2. Real-time synchronized word and sentence read-along highlighting with focus dimming.
3. Live Interactive Player Preview and Appearance customization tab in admin settings.
4. Voice & Speech settings with browser voice dropdown and test synthesis button.
5. Phonetic Pronunciation (Aliases) dictionary table with inline audio test.
6. Bring-Your-Own-Key (BYOK) AI provider settings (OpenAI, ElevenLabs, Google Cloud, Polly, Custom).
7. Audio listening analytics dashboard with top played posts and engagement stats.
8. Post edit screen sidebar metabox with custom MP3 upload and voice overrides.
9. Posts list table with Audio Status column and bulk enablement actions.

== Changelog ==

= 1.0.0 =
* Initial official release.
* Zero-cost browser speech synthesis engine with 200+ system voices.
* Real-time synchronized word and sentence read-along highlighting with radial auto-alignment.
* Sticky auto-docking floating player bar with time counter and playback speed selector.
* Interactive Live Player Preview in admin appearance settings.
* Bring-Your-Own-Key (BYOK) AI integrations for OpenAI, ElevenLabs, Google Cloud TTS, Amazon Polly, and Custom AI.
* Phonetic Pronunciation Dictionary (Aliases) with inline audio testing.
* Floating Text Selection Popover Reader.
* Post-specific overrides metabox (custom MP3, voice override, custom intro/outro).
* Audio Status column and bulk actions on Posts and Pages list tables.
* AudioObject JSON-LD structured schema for search engines.
* Full compatibility with WordPress 6.2 through 7.1 and PHP 7.4 through 8.5.

== Upgrade Notice ==

= 1.0.0 =
Initial release of Text to Speech Player. Install to convert your articles and pages into natural speech.
