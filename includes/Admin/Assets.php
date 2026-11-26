<?php
namespace TextToSpeechPlayer\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Admin Assets Handler.
 */
class Assets {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Enqueue scripts and styles targeted by screen.
	 *
	 * @param string $hook Admin page hook.
	 */
	public function enqueue_assets( $hook ) {
		$screen           = get_current_screen();
		$is_settings_page = ( 'toplevel_page_tts-player-settings' === $hook || ( $screen && 'toplevel_page_tts-player-settings' === $screen->id ) );
		$is_post_page     = ( $screen && in_array( $screen->base, array( 'post' ), true ) );

		if ( $is_post_page ) {
			wp_enqueue_media();
			wp_register_script( 'tts-player-metabox', false, array( 'media-editor' ), TTS_PLAYER_VERSION, true );
			wp_enqueue_script( 'tts-player-metabox' );
			$metabox_l10n = wp_json_encode( array(
				'title'  => __( 'Select or Upload MP3 Audio File', 'text-to-speech-player' ),
				'button' => __( 'Use this Audio File', 'text-to-speech-player' ),
			) );
			wp_add_inline_script(
				'tts-player-metabox',
				"document.addEventListener('DOMContentLoaded',function(){var u=document.getElementById('tts_upload_mp3_btn'),c=document.getElementById('tts_clear_mp3_btn'),i=document.getElementById('tts_player_custom_mp3'),l={$metabox_l10n};if(u&&typeof wp!=='undefined'&&wp.media){var f;u.addEventListener('click',function(e){e.preventDefault();if(f){f.open();return;}f=wp.media({title:l.title,button:{text:l.button},library:{type:'audio'},multiple:false});f.on('select',function(){var a=f.state().get('selection').first().toJSON();if(a&&a.url){i.value=a.url;}});f.open();});}if(c&&i){c.addEventListener('click',function(e){e.preventDefault();i.value='';});}});"
			);
			return;
		}

		if ( ! $is_settings_page ) {
			return;
		}

		$current_user = wp_get_current_user();
		$settings     = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		$aliases      = get_option( TTS_PLAYER_OPTION_ALIASES, array() );

		// Enumerate public post types
		$public_pts = get_post_types( array( 'public' => true ), 'objects' );
		$pt_options = array();
		foreach ( $public_pts as $pt ) {
			if ( 'attachment' !== $pt->name ) {
				$pt_options[] = array(
					'value' => $pt->name,
					'label' => $pt->label,
				);
			}
		}

		$localized_data = array(
			'restUrl'            => esc_url_raw( rest_url( 'text-to-speech-player/v1/' ) ),
			'nonce'              => wp_create_nonce( 'wp_rest' ),
			'pluginUrl'          => TTS_PLAYER_URL,
			'assetsUrl'          => TTS_PLAYER_ASSETS_URL,
			'settings'           => $settings,
			'aliases'            => is_array( $aliases ) ? $aliases : array(),
			'availablePostTypes' => $pt_options,
			'currentUser'        => array(
				'displayName' => $current_user->display_name,
				'userEmail'   => $current_user->user_email,
				'avatarUrl'   => get_avatar_url( $current_user->ID, array( 'size' => 96 ) ),
			),
			'environment'        => array(
				'phpVersion'       => PHP_VERSION,
				'wpVersion'        => get_bloginfo( 'version' ),
				'openssl'          => extension_loaded( 'openssl' ),
				'memoryLimit'      => ini_get( 'memory_limit' ) ? ini_get( 'memory_limit' ) : 'N/A',
				'maxExecutionTime' => ini_get( 'max_execution_time' ) ? ini_get( 'max_execution_time' ) . 's' : 'N/A',
			),
			'i18n'               => array(
				'saveSuccess'      => __( 'Settings saved successfully!', 'text-to-speech-player' ),
				'saveFailed'       => __( 'Failed to save settings. Please try again.', 'text-to-speech-player' ),
				'testSpeech'       => __( 'Test Speech', 'text-to-speech-player' ),
				'testing'          => __( 'Generating audio...', 'text-to-speech-player' ),
				'connected'        => __( 'Ready', 'text-to-speech-player' ),
				'disconnected'     => __( 'Not Configured', 'text-to-speech-player' ),
			),
		);

		wp_enqueue_style( 'wp-components' );

		if ( $is_settings_page ) {
			$asset_file = TTS_PLAYER_PATH . 'assets/build/index.asset.php';
			$asset_info = file_exists( $asset_file ) ? require $asset_file : array(
				'dependencies' => array( 'wp-element', 'wp-components', 'wp-api-fetch', 'wp-data', 'wp-i18n' ),
				'version'      => TTS_PLAYER_VERSION,
			);

			if ( file_exists( TTS_PLAYER_PATH . 'assets/build/index.js' ) ) {
				wp_enqueue_script(
					'tts-player-admin-settings',
					TTS_PLAYER_ASSETS_URL . 'build/index.js',
					$asset_info['dependencies'],
					$asset_info['version'],
					true
				);

				wp_localize_script( 'tts-player-admin-settings', 'ttsPlayerData', $localized_data );
				wp_set_script_translations( 'tts-player-admin-settings', 'text-to-speech-player', TTS_PLAYER_PATH . 'languages' );
			}

			if ( file_exists( TTS_PLAYER_PATH . 'assets/build/index.css' ) ) {
				wp_enqueue_style(
					'tts-player-admin-settings',
					TTS_PLAYER_ASSETS_URL . 'build/index.css',
					array( 'wp-components' ),
					$asset_info['version']
				);
				wp_add_inline_style(
					'tts-player-admin-settings',
					'body.toplevel_page_tts-player-settings #wpcontent,body:has(.tts-player-admin-wrap) #wpcontent{padding-left:0!important}body.toplevel_page_tts-player-settings #wpbody,body:has(.tts-player-admin-wrap) #wpbody{padding-top:0!important}body.toplevel_page_tts-player-settings #wpbody-content,body:has(.tts-player-admin-wrap) #wpbody-content{padding:0!important}body.toplevel_page_tts-player-settings .wrap.tts-player-admin-wrap,.wrap.tts-player-admin-wrap{margin:0!important;padding:0!important;max-width:none!important}'
				);
			}
		}
	}
}
