<?php
namespace TextToSpeechPlayer;

defined( 'ABSPATH' ) || exit;

/**
 * Main Singleton Plugin Class.
 */
class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Services.
	 */
	public $admin_menu;
	public $assets;
	public $post_metabox;
	public $rest_server;
	public $player;
	public $shortcode;
	public $block;
	public $text_extractor;
	public $alias_engine;
	public $audio_schema;

	/**
	 * Get singleton instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->init_services();
		$this->init_hooks();
	}

	/**
	 * Instantiate all core services.
	 */
	private function init_services() {
		$this->text_extractor = new Services\TextExtractor();
		$this->alias_engine   = new Services\AliasEngine();
		$this->audio_schema   = new Services\AudioSchema();

		if ( is_admin() ) {
			$this->admin_menu   = new Admin\AdminMenu();
			$this->assets       = new Admin\Assets();
			$this->post_metabox = new Admin\PostMetabox();
		}

		$this->rest_server    = new API\RestServer();
		$this->player         = new Frontend\Player( $this->text_extractor, $this->alias_engine );
		$this->shortcode      = new Frontend\Shortcode( $this->player );
		$this->block          = new Frontend\Block( $this->player );
	}

	/**
	 * Initialize hooks.
	 */
	private function init_hooks() {
		add_action( 'wp_head', array( $this->audio_schema, 'render_schema' ), 30 );
	}
}
