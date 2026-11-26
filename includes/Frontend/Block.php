<?php
namespace TextToSpeechPlayer\Frontend;

defined( 'ABSPATH' ) || exit;

/**
 * Gutenberg Block Handler for Text to Speech Player.
 */
class Block {

	/**
	 * Player service.
	 *
	 * @var Player
	 */
	protected $player;

	/**
	 * Constructor.
	 *
	 * @param Player $player
	 */
	public function __construct( Player $player ) {
		$this->player = $player;
		add_action( 'init', array( $this, 'register_block' ) );
	}

	/**
	 * Register Gutenberg dynamic block.
	 */
	public function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		register_block_type(
			'text-to-speech-player/audio-player',
			array(
				'api_version'     => 2,
				'title'           => __( 'Audio Reader Player', 'text-to-speech-player' ),
				'category'        => 'media',
				'icon'            => 'format-audio',
				'description'     => __( 'Insert a stylish, customizable Text to Speech audio player into your content.', 'text-to-speech-player' ),
				'attributes'      => array(
					'buttonLabel'  => array( 'type' => 'string', 'default' => '' ),
					'playerTheme'  => array( 'type' => 'string', 'default' => '' ),
					'accentColor'  => array( 'type' => 'string', 'default' => '' ),
					'buttonRadius' => array( 'type' => 'string', 'default' => '' ),
					'buttonSize'   => array( 'type' => 'string', 'default' => '' ),
					'customMp3'    => array( 'type' => 'string', 'default' => '' ),
				),
				'render_callback' => array( $this, 'render_block' ),
			)
		);
	}

	/**
	 * Dynamic render callback for the block.
	 *
	 * @param array  $attributes
	 * @param string $content
	 * @return string HTML
	 */
	public function render_block( $attributes, $content = '' ) {
		global $post;
		if ( ! $post ) {
			return '';
		}

		$shortcode_atts = array();
		if ( ! empty( $attributes['buttonLabel'] ) ) {
			$shortcode_atts['listen_text'] = $attributes['buttonLabel'];
		}
		if ( ! empty( $attributes['playerTheme'] ) ) {
			$shortcode_atts['theme'] = $attributes['playerTheme'];
		}
		if ( ! empty( $attributes['accentColor'] ) ) {
			$shortcode_atts['accent'] = $attributes['accentColor'];
		}
		if ( ! empty( $attributes['buttonRadius'] ) ) {
			$shortcode_atts['radius'] = $attributes['buttonRadius'];
		}
		if ( ! empty( $attributes['buttonSize'] ) ) {
			$shortcode_atts['size'] = $attributes['buttonSize'];
		}
		if ( ! empty( $attributes['customMp3'] ) ) {
			$shortcode_atts['custom_mp3'] = $attributes['customMp3'];
		}

		$shortcode = new Shortcode( $this->player );
		return $shortcode->render_shortcode( $shortcode_atts, $content );
	}
}
