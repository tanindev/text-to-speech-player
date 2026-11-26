<?php
namespace TextToSpeechPlayer\Frontend;

use TextToSpeechPlayer\Services\TextExtractor;
use TextToSpeechPlayer\Services\AliasEngine;

defined( 'ABSPATH' ) || exit;

/**
 * Frontend Audio Player Ingestion & Asset Enqueueing.
 */
class Player {

	protected $extractor;
	protected $alias_engine;

	/**
	 * Track rendered posts on this request to prevent duplicate markup.
	 *
	 * @var array
	 */
	protected static $rendered_posts = array();

	/**
	 * Constructor.
	 *
	 * @param TextExtractor $extractor
	 * @param AliasEngine   $alias_engine
	 */
	public function __construct( TextExtractor $extractor, AliasEngine $alias_engine ) {
		$this->extractor    = $extractor;
		$this->alias_engine = $alias_engine;

		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'the_content', array( $this, 'filter_content' ), 20 );
		add_action( 'wp_footer', array( $this, 'render_sticky_footer_player' ), 50 );
	}

	/**
	 * Get the text extractor service.
	 *
	 * @return TextExtractor
	 */
	public function get_extractor() {
		return $this->extractor;
	}

	/**
	 * Get the pronunciation alias engine.
	 *
	 * @return AliasEngine
	 */
	public function get_alias_engine() {
		return $this->alias_engine;
	}

	/**
	 * Determine if the player should be displayed on the given post.
	 *
	 * @param \WP_Post $post
	 * @param array    $settings
	 * @return bool
	 */
	public function should_render_for_post( $post, $settings = array() ) {
		if ( empty( $settings ) ) {
			$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		}

		// Check if disabled on front page / home page
		if ( ! empty( $settings['disable_on_front_page'] ) && ( is_front_page() || is_home() ) ) {
			return false;
		}

		$post_types = ! empty( $settings['enabled_post_types'] ) && is_array( $settings['enabled_post_types'] )
			? $settings['enabled_post_types']
			: array( 'post' );

		if ( ! in_array( $post->post_type, $post_types, true ) ) {
			return false;
		}

		// Exclude by Post IDs
		if ( ! empty( $settings['exclude_post_ids'] ) ) {
			$excluded_ids = array_filter( array_map( 'absint', preg_split( '/[,|\s]+/', (string) $settings['exclude_post_ids'] ) ) );
			if ( in_array( $post->ID, $excluded_ids, true ) ) {
				return false;
			}
		}

		// Exclude by Categories
		if ( ! empty( $settings['exclude_categories'] ) && is_array( $settings['exclude_categories'] ) ) {
			if ( has_category( $settings['exclude_categories'], $post ) ) {
				return false;
			}
		}

		// Exclude by WordPress Tags
		if ( ! empty( $settings['exclude_wp_tags'] ) && is_array( $settings['exclude_wp_tags'] ) ) {
			if ( has_tag( $settings['exclude_wp_tags'], $post ) ) {
				return false;
			}
		}

		// Visibility check by user role
		if ( ! empty( $settings['display_player_to'] ) && is_array( $settings['display_player_to'] ) && ! in_array( 'all', $settings['display_player_to'], true ) ) {
			if ( in_array( 'logged_in', $settings['display_player_to'], true ) ) {
				if ( ! is_user_logged_in() ) {
					return false;
				}
			} else {
				if ( ! is_user_logged_in() ) {
					return false;
				}
				$current_user = wp_get_current_user();
				$has_role     = false;
				foreach ( $current_user->roles as $role ) {
					if ( in_array( $role, $settings['display_player_to'], true ) ) {
						$has_role = true;
						break;
					}
				}
				if ( ! $has_role ) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Enqueue front-end player runtime assets for singular posts.
	 */
	public function enqueue_assets() {
		if ( ! is_singular() ) {
			return;
		}

		global $post;
		$queried     = get_queried_object();
		$target_post = ( $post instanceof \WP_Post ) ? $post : ( ( $queried instanceof \WP_Post ) ? $queried : null );

		if ( ! $target_post || get_post_meta( $target_post->ID, '_tts_player_disable', true ) ) {
			return;
		}

		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );

		if ( ! $this->should_render_for_post( $target_post, $settings ) ) {
			return;
		}

		$this->enqueue_player_assets( $target_post );
	}

	/**
	 * Core asset enqueuing logic (callable by auto-injector or custom shortcode).
	 *
	 * @param \WP_Post|null $post Optional post object.
	 */
	public function enqueue_player_assets( $post = null ) {
		static $enqueued = false;
		if ( $enqueued ) {
			return;
		}
		$enqueued = true;

		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );

		$asset_file = TTS_PLAYER_PATH . 'assets/build/player.asset.php';
		$asset_info = file_exists( $asset_file ) ? require $asset_file : array(
			'dependencies' => array(),
			'version'      => TTS_PLAYER_VERSION,
		);

		if ( file_exists( TTS_PLAYER_PATH . 'assets/build/player.js' ) ) {
			$script_ver = ( ! empty( $asset_info['version'] ) ? $asset_info['version'] : TTS_PLAYER_VERSION ) . '.' . filemtime( TTS_PLAYER_PATH . 'assets/build/player.js' );
			wp_enqueue_script(
				'tts-player-runtime',
				TTS_PLAYER_ASSETS_URL . 'build/player.js',
				$asset_info['dependencies'],
				$script_ver,
				true
			);

			$custom_voice = ( $post && ! empty( $post->ID ) ) ? get_post_meta( $post->ID, '_tts_player_custom_voice', true ) : '';
			if ( empty( $custom_voice ) && ! empty( $settings['default_voice'] ) ) {
				$custom_voice = $settings['default_voice'];
			}

			// Multilingual Auto-Detection: Polylang, WPML, TranslatePress, or WP Locale
			$post_locale = get_locale();
			if ( $post && ! empty( $post->ID ) && function_exists( 'pll_get_post_language' ) ) {
				$pll_lang = pll_get_post_language( $post->ID, 'locale' );
				if ( ! empty( $pll_lang ) ) {
					$post_locale = $pll_lang;
				}
			} elseif ( defined( 'ICL_LANGUAGE_CODE' ) && ICL_LANGUAGE_CODE ) {
				$post_locale = ICL_LANGUAGE_CODE;
			}

			wp_localize_script( 'tts-player-runtime', 'ttsPlayerConfig', array(
				'restUrl'             => esc_url_raw( rest_url( 'text-to-speech-player/v1/' ) ),
				'postId'              => ( $post && ! empty( $post->ID ) ) ? $post->ID : 0,
				'postLocale'          => $post_locale,
				'accentColor'         => ! empty( $settings['accent_color'] ) ? $settings['accent_color'] : '#1a73e8',
				'buttonRadius'        => ! empty( $settings['button_radius'] ) ? $settings['button_radius'] : 'pill',
				'buttonSize'          => ! empty( $settings['button_size'] ) ? $settings['button_size'] : 'medium',
				'highlightColor'      => ! empty( $settings['highlight_color'] ) ? $settings['highlight_color'] : '#fef08a',
				'highlightSentenceBg' => ! empty( $settings['highlight_sentence_bg'] ) ? $settings['highlight_sentence_bg'] : '#e8e7fe',
				'highlightMode'       => ! empty( $settings['highlight_mode'] ) ? $settings['highlight_mode'] : 'word',
				'dimEnabled'          => ! empty( $settings['dim_enabled'] ),
				'dimOpacity'          => isset( $settings['dim_opacity'] ) ? floatval( $settings['dim_opacity'] ) : 0.7,
				'enableHighlight'     => ! empty( $settings['enable_highlighting'] ),
				'enableDock'          => ! empty( $settings['enable_floating_dock'] ),
				'dockPosition'        => ! empty( $settings['floating_dock_position'] ) ? $settings['floating_dock_position'] : 'bottom_right',
				'enableSelection'     => ! empty( $settings['enable_selection_reader'] ),
				'stopOnTabSwitch'     => ! empty( $settings['stop_on_tab_switch'] ),
				'readFromDom'         => ! empty( $settings['read_content_from_dom'] ),
				'excludeTags'         => ! empty( $settings['exclude_tags'] ) ? $settings['exclude_tags'] : 'aside|figure|script|style|figcaption|code|pre',
				'excludeSelectors'    => ! empty( $settings['exclude_css_selectors'] ) ? $settings['exclude_css_selectors'] : '',
				'listenText'          => ! empty( $settings['listen_text'] ) ? $settings['listen_text'] : __( 'Listen to this article', 'text-to-speech-player' ),
				'pauseText'           => ! empty( $settings['pause_text'] ) ? $settings['pause_text'] : __( 'Pause', 'text-to-speech-player' ),
				'resumeText'          => ! empty( $settings['resume_text'] ) ? $settings['resume_text'] : __( 'Resume', 'text-to-speech-player' ),
				'replayText'          => ! empty( $settings['replay_text'] ) ? $settings['replay_text'] : __( 'Listen again', 'text-to-speech-player' ),
				'otherPlayerPlaying'  => __( 'Another audio player is currently playing', 'text-to-speech-player' ),
				'customVoice'         => $custom_voice,
				'defaultRate'         => ! empty( $settings['default_rate'] ) ? floatval( $settings['default_rate'] ) : 1.0,
				'defaultPitch'        => ! empty( $settings['default_pitch'] ) ? floatval( $settings['default_pitch'] ) : 1.0,
				'postTitle'           => ( $post && ! empty( $post->ID ) ) ? get_the_title( $post ) : get_bloginfo( 'name' ),
				'featuredImage'       => ( $post && ! empty( $post->ID ) && has_post_thumbnail( $post->ID ) ) ? (string) get_the_post_thumbnail_url( $post->ID, 'large' ) : '',
				'siteTitle'           => get_bloginfo( 'name' ),
				'enableKeyboard'      => ! isset( $settings['enable_keyboard_shortcuts'] ) || ! empty( $settings['enable_keyboard_shortcuts'] ),
				'showListenTime'      => ! isset( $settings['show_listen_time'] ) || ! empty( $settings['show_listen_time'] ),
				'enableDownload'      => ! empty( $settings['enable_download_button'] ),
				'themePreset'         => ! empty( $settings['theme_preset'] ) ? $settings['theme_preset'] : 'auto',
				'srPlaying'           => __( 'Audio playback started', 'text-to-speech-player' ),
				'srPaused'            => __( 'Audio playback paused', 'text-to-speech-player' ),
				'srEnded'             => __( 'Audio playback completed', 'text-to-speech-player' ),
			) );
		}

		if ( file_exists( TTS_PLAYER_PATH . 'assets/build/player.css' ) ) {
			$style_ver = ( ! empty( $asset_info['version'] ) ? $asset_info['version'] : TTS_PLAYER_VERSION ) . '.' . filemtime( TTS_PLAYER_PATH . 'assets/build/player.css' );
			wp_enqueue_style(
				'tts-player-runtime',
				TTS_PLAYER_ASSETS_URL . 'build/player.css',
				array(),
				$style_ver
			);

			$highlight_color       = ( ! empty( $settings['highlight_color'] ) ? sanitize_hex_color( $settings['highlight_color'] ) : '' ) ?: '#fef08a';
			$highlight_sentence_bg = ( ! empty( $settings['highlight_sentence_bg'] ) ? sanitize_hex_color( $settings['highlight_sentence_bg'] ) : '' ) ?: '#e8e7fe';
			$accent_color          = ( ! empty( $settings['accent_color'] ) ? sanitize_hex_color( $settings['accent_color'] ) : '' ) ?: '#1a73e8';
			wp_add_inline_style(
				'tts-player-runtime',
				":root { --tts-highlight-color: {$highlight_color}; --tts-sentence-bg: {$highlight_sentence_bg}; --tts-accent-color: {$accent_color}; }"
			);
		}
	}

	/**
	 * Append or prepend player bar to post content for inline placement modes.
	 *
	 * @param string $content Post content.
	 * @return string Modified content.
	 */
	public function filter_content( $content ) {
		if ( ! is_singular() || is_feed() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return $content;
		}

		global $post;
		$queried     = get_queried_object();
		$target_post = ( $post instanceof \WP_Post ) ? $post : ( ( $queried instanceof \WP_Post ) ? $queried : null );

		if ( ! $target_post || get_post_meta( $target_post->ID, '_tts_player_disable', true ) ) {
			return $content;
		}

		// Prevent injecting into secondary/sidebar query posts if queried object is a post
		if ( $queried instanceof \WP_Post && $target_post->ID !== $queried->ID ) {
			return $content;
		}

		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );

		if ( ! $this->should_render_for_post( $target_post, $settings ) ) {
			return $content;
		}

		$position = ! empty( $settings['player_position'] ) ? $settings['player_position'] : 'before_content';
		if ( 'manual' === $position || 'sticky' === $position ) {
			return $content;
		}

		// Prevent duplicate injection in the same post
		if ( isset( self::$rendered_posts[ $target_post->ID ] ) ) {
			return $content;
		}
		self::$rendered_posts[ $target_post->ID ] = true;

		$player_html = $this->render_player_markup( $target_post, $content );

		if ( 'after_content' === $position ) {
			return $content . $player_html;
		}

		return $player_html . $content;
	}

	/**
	 * Output sticky floating player in wp_footer if sticky mode is active.
	 */
	public function render_sticky_footer_player() {
		if ( ! is_singular() || is_feed() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		$position = ! empty( $settings['player_position'] ) ? $settings['player_position'] : 'before_content';
		if ( 'sticky' !== $position ) {
			return;
		}

		global $post;
		$queried     = get_queried_object();
		$target_post = ( $post instanceof \WP_Post ) ? $post : ( ( $queried instanceof \WP_Post ) ? $queried : null );

		if ( ! $target_post || get_post_meta( $target_post->ID, '_tts_player_disable', true ) ) {
			return;
		}

		if ( isset( self::$rendered_posts[ $target_post->ID ] ) ) {
			return;
		}

		if ( ! $this->should_render_for_post( $target_post, $settings ) ) {
			return;
		}

		self::$rendered_posts[ $target_post->ID ] = true;

		// Ensure assets are enqueued
		$this->enqueue_player_assets( $target_post );

		echo $this->render_player_markup( $target_post, $target_post->post_content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Render the audio player markup.
	 *
	 * @param \WP_Post $post
	 * @param string   $content
	 * @return string HTML
	 */
	public function render_player_markup( $post, $content = '' ) {
		$settings      = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		$label         = isset( $settings['button_label'] ) ? $settings['button_label'] : __( 'Listen to this article', 'text-to-speech-player' );
		$theme         = ! empty( $settings['player_theme'] ) ? $settings['player_theme'] : 'modern_light';
		$accent_color  = ! empty( $settings['accent_color'] ) ? $settings['accent_color'] : '#1a73e8';
		$button_radius = ! empty( $settings['button_radius'] ) ? $settings['button_radius'] : 'pill';
		$button_size   = ! empty( $settings['button_size'] ) ? $settings['button_size'] : 'medium';
		$default_rate  = ! empty( $settings['default_rate'] ) ? floatval( $settings['default_rate'] ) : 1.0;

		$position        = ! empty( $settings['player_position'] ) ? $settings['player_position'] : 'before_content';
		$is_sticky       = ( 'sticky' === $position );
		$sticky_position = ! empty( $settings['sticky_position'] ) ? $settings['sticky_position'] : 'bottom_right';
		$sticky_offset_x = isset( $settings['sticky_offset_x'] ) ? intval( $settings['sticky_offset_x'] ) : 24;
		$sticky_offset_y = isset( $settings['sticky_offset_y'] ) ? intval( $settings['sticky_offset_y'] ) : 24;

		// Post-specific overrides
		$custom_mp3   = get_post_meta( $post->ID, '_tts_player_custom_mp3', true );
		$custom_intro = get_post_meta( $post->ID, '_tts_player_custom_intro', true );
		$custom_outro = get_post_meta( $post->ID, '_tts_player_custom_outro', true );

		$extraction_options = $settings;
		if ( ! empty( $custom_intro ) ) {
			$extraction_options['text_before_content'] = $custom_intro;
		}
		if ( ! empty( $custom_outro ) ) {
			$extraction_options['text_after_content'] = $custom_outro;
		}

		// Extract speakable text and exact content boundary offsets for the player payload
		$extracted_data = $this->extractor->extract_with_offsets( $content ? $content : $post->post_content, $extraction_options, $post );

		// Apply pronunciation aliases per segment to maintain exact character boundary indices
		$pre_spoken   = $this->alias_engine->apply( $extracted_data['pre_text'] );
		$body_spoken  = $this->alias_engine->apply( $extracted_data['body_text'] );
		$outro_spoken = $this->alias_engine->apply( $extracted_data['outro_text'] );

		$all_parts = array();
		if ( '' !== $pre_spoken ) {
			$all_parts[] = $pre_spoken;
		}
		if ( '' !== $body_spoken ) {
			$all_parts[] = $body_spoken;
		}
		if ( '' !== $outro_spoken ) {
			$all_parts[] = $outro_spoken;
		}

		$speakable         = trim( implode( ' ', $all_parts ) );
		$body_start_offset = ( '' !== $pre_spoken ) ? mb_strlen( $pre_spoken . ' ' ) : 0;
		$body_end_offset   = $body_start_offset + mb_strlen( $body_spoken );
		$intro_text        = $extracted_data['intro'];
		$outro_text        = $extracted_data['outro'];

		// Calculate estimated listening time badge
		$word_count = count( preg_split( '/\s+/', trim( wp_strip_all_tags( $speakable ) ) ) );
		$minutes    = max( 1, (int) ceil( $word_count / 140 ) );
		/* translators: %d: Estimated listening time in minutes */
		$listen_time_badge = sprintf( _n( '%d min listen', '%d min listen', $minutes, 'text-to-speech-player' ), $minutes );

		ob_start();
		tts_player_get_template( 'player-bar.php', array(
			'post_id'             => $post->ID,
			'post_title'          => get_the_title( $post ),
			'featured_image'      => ( has_post_thumbnail( $post->ID ) ? (string) get_the_post_thumbnail_url( $post->ID, 'large' ) : '' ),
			'button_label'        => $label,
			'player_theme'        => $theme,
			'accent_color'        => $accent_color,
			'button_radius'       => $button_radius,
			'button_size'         => $button_size,
			'speakable_text'      => $speakable,
			'body_start_offset'   => $body_start_offset,
			'body_end_offset'     => $body_end_offset,
			'intro_text'          => $intro_text,
			'outro_text'          => $outro_text,
			'custom_mp3'          => $custom_mp3,
			'default_rate'        => $default_rate,
			'is_sticky'           => $is_sticky,
			'sticky_position'     => $sticky_position,
			'sticky_offset_x'     => $sticky_offset_x,
			'sticky_offset_y'     => $sticky_offset_y,
			'listen_text'         => ! empty( $settings['listen_text'] ) ? $settings['listen_text'] : $label,
			'pause_text'          => ! empty( $settings['pause_text'] ) ? $settings['pause_text'] : __( 'Pause', 'text-to-speech-player' ),
			'resume_text'         => ! empty( $settings['resume_text'] ) ? $settings['resume_text'] : __( 'Resume', 'text-to-speech-player' ),
			'replay_text'         => ! empty( $settings['replay_text'] ) ? $settings['replay_text'] : __( 'Listen again', 'text-to-speech-player' ),
			'show_listen_time'    => ! isset( $settings['show_listen_time'] ) || ! empty( $settings['show_listen_time'] ),
			'listen_time_badge'   => $listen_time_badge,
			'enable_download'     => ! empty( $settings['enable_download_button'] ),
		) );
		return ob_get_clean();
	}
}
