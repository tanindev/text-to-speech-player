<?php
namespace TextToSpeechPlayer\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Admin Menu Page Registration.
 */
class AdminMenu {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ), 50 );
		add_filter( 'plugin_action_links_' . plugin_basename( TTS_PLAYER_FILE ), array( $this, 'add_action_links' ) );
	}

	/**
	 * Add Settings action link on the plugins list page.
	 *
	 * @param array $links Current plugin action links.
	 * @return array
	 */
	public function add_action_links( $links ) {
		$settings_link = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'admin.php?page=tts-player-settings' ) ),
			esc_html__( 'Settings', 'text-to-speech-player' )
		);
		array_unshift( $links, $settings_link );
		return $links;
	}

	/**
	 * Register Admin Menu for Text to Speech Player.
	 */
	public function register_menu() {
		add_menu_page(
			__( 'Text to Speech', 'text-to-speech-player' ),
			__( 'Text to Speech', 'text-to-speech-player' ),
			'manage_options',
			'tts-player-settings',
			array( $this, 'render_page' ),
			'dashicons-format-audio',
			30
		);
	}

	/**
	 * Render React root container.
	 */
	public function render_page() {
		?>
		<div class="wrap tts-player-admin-wrap">
			<hr class="wp-header-end" style="display:none !important; margin:0; border:0;">
			<div id="tts-player-notices-staging" style="display:none;"></div>
			<div id="tts-player-admin-root">
				<div class="tts-player-loading-placeholder" style="padding: 60px 20px; text-align: center;">
					<p style="font-size: 16px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
						<?php esc_html_e( 'Loading Text to Speech Player...', 'text-to-speech-player' ); ?>
					</p>
				</div>
			</div>
		</div>
		<?php
	}
}
