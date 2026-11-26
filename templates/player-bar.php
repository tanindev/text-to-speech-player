<?php
/**
 * Player Bar Template.
 *
 * Can be overridden by copying to {your-theme}/text-to-speech-player/player-bar.php.
 *
 * @var int    $post_id
 * @var string $button_label
 * @var string $player_theme
 * @var string $accent_color
 * @var string $button_radius
 * @var string $button_size
 * @var string $speakable_text
 * @var float  $default_rate
 * @var string $custom_mp3
 * @var string $listen_text
 * @var string $pause_text
 * @var string $resume_text
 * @var string $replay_text
 * @var bool   $is_sticky
 * @var string $sticky_position
 * @var int    $sticky_offset_x
 * @var int    $sticky_offset_y
 * @var string $post_title
 * @var string $featured_image
 * @var bool   $show_listen_time
 * @var string $listen_time_badge
 * @var bool   $enable_download
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- Template variables are scoped inside Template::get_template().

$accent_color       = ! empty( $accent_color ) ? $accent_color : '#1a73e8';
$button_radius      = ! empty( $button_radius ) ? $button_radius : 'pill';
$button_size        = ! empty( $button_size ) ? $button_size : 'medium';
$player_theme       = ! empty( $player_theme ) ? $player_theme : 'modern_light';
$default_rate       = isset( $default_rate ) ? floatval( $default_rate ) : 1.0;
$is_sticky          = ! empty( $is_sticky );
$sticky_position    = ! empty( $sticky_position ) ? $sticky_position : 'bottom_right';
$sticky_offset_x    = isset( $sticky_offset_x ) ? intval( $sticky_offset_x ) : 24;
$sticky_offset_y    = isset( $sticky_offset_y ) ? intval( $sticky_offset_y ) : 24;
$post_title         = ! empty( $post_title ) ? $post_title : '';
$featured_image     = ! empty( $featured_image ) ? $featured_image : '';
$show_listen_time   = ! empty( $show_listen_time );
$listen_time_badge  = ! empty( $listen_time_badge ) ? $listen_time_badge : '';
$enable_download    = ! empty( $enable_download );
$body_start_offset  = isset( $body_start_offset ) ? intval( $body_start_offset ) : 0;
$body_end_offset    = isset( $body_end_offset ) ? intval( $body_end_offset ) : 0;
$intro_text         = ! empty( $intro_text ) ? $intro_text : '';
$outro_text         = ! empty( $outro_text ) ? $outro_text : '';

$radius_map = array(
	'pill'       => '9999px',
	'rounded_lg' => '16px',
	'rounded_md' => '8px',
	'sharp'      => '4px',
	'square'     => '0px',
);
$radius_css = isset( $radius_map[ $button_radius ] ) ? $radius_map[ $button_radius ] : '9999px';

$listen_label = ! empty( $listen_text ) ? $listen_text : ( isset( $button_label ) ? $button_label : __( 'Listen to this article', 'text-to-speech-player' ) );
$pause_label  = ! empty( $pause_text ) ? $pause_text : __( 'Pause', 'text-to-speech-player' );
$resume_label = ! empty( $resume_text ) ? $resume_text : __( 'Resume', 'text-to-speech-player' );
$replay_label = ! empty( $replay_text ) ? $replay_text : __( 'Listen again', 'text-to-speech-player' );

$is_icon_only     = ( '' === trim( (string) $listen_label ) );
$accessible_label = ! $is_icon_only ? $listen_label : __( 'Listen to this article', 'text-to-speech-player' );

$container_classes = array(
	'tts-player-container',
	'tts-player-theme-' . sanitize_html_class( $player_theme ),
	'tts-player-radius-' . sanitize_html_class( $button_radius ),
	'tts-player-size-' . sanitize_html_class( $button_size ),
);

if ( $is_icon_only ) {
	$container_classes[] = 'tts-player-icon-only';
}
if ( ! empty( $custom_mp3 ) ) {
	$container_classes[] = 'tts-has-custom-audio';
}
if ( $is_sticky ) {
	$container_classes[] = 'tts-player-sticky';
	$container_classes[] = 'tts-sticky-' . sanitize_html_class( $sticky_position );
}

$inline_styles = array(
	'--tts-accent: ' . esc_attr( $accent_color ),
	'--tts-radius: ' . esc_attr( $radius_css ),
);
if ( $is_sticky ) {
	$inline_styles[] = '--tts-sticky-x: ' . esc_attr( $sticky_offset_x ) . 'px';
	$inline_styles[] = '--tts-sticky-y: ' . esc_attr( $sticky_offset_y ) . 'px';
}
?>
<div class="<?php echo esc_attr( implode( ' ', $container_classes ) ); ?>"
	data-post-id="<?php echo esc_attr( $post_id ); ?>"
	data-post-title="<?php echo esc_attr( $post_title ); ?>"
	data-featured-image="<?php echo esc_url( $featured_image ); ?>"
	data-listen-text="<?php echo esc_attr( $listen_label ); ?>"
	data-pause-text="<?php echo esc_attr( $pause_label ); ?>"
	data-resume-text="<?php echo esc_attr( $resume_label ); ?>"
	data-replay-text="<?php echo esc_attr( $replay_label ); ?>"
	<?php if ( ! empty( $custom_mp3 ) ) : ?>data-custom-audio="<?php echo esc_url( $custom_mp3 ); ?>"<?php endif; ?>
	style="<?php echo esc_attr( implode( '; ', $inline_styles ) ); ?>;">

	<?php if ( ! empty( $custom_mp3 ) ) : ?>
		<audio class="tts-native-audio" src="<?php echo esc_url( $custom_mp3 ); ?>" preload="metadata" style="display:none;"></audio>
	<?php endif; ?>

	<div class="tts-player-bar">
		<button type="button" class="tts-player-toggle" aria-label="<?php echo esc_attr( $accessible_label ); ?>" title="<?php echo esc_attr( $accessible_label ); ?>">
			<span class="tts-icon-play">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<path d="M8 5v14l11-7z"/>
				</svg>
			</span>
			<span class="tts-icon-pause" style="display:none;">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
				</svg>
			</span>
			<?php if ( ! $is_icon_only ) : ?>
				<span class="tts-player-label"><?php echo esc_html( $listen_label ); ?></span>
			<?php endif; ?>
		</button>

		<?php if ( $show_listen_time && ! empty( $listen_time_badge ) ) : ?>
			<span class="tts-player-time-badge" title="<?php esc_attr_e( 'Estimated listening time', 'text-to-speech-player' ); ?>">
				<span class="tts-badge-icon">🎧</span>
				<span class="tts-badge-text"><?php echo esc_html( $listen_time_badge ); ?></span>
			</span>
		<?php endif; ?>

		<div class="tts-player-waveform" style="display:none;">
			<span class="tts-wave-bar"></span>
			<span class="tts-wave-bar"></span>
			<span class="tts-wave-bar"></span>
			<span class="tts-wave-bar"></span>
		</div>

		<!-- Interactive Progress Track & Scrubber -->
		<div class="tts-player-progress-wrap" style="display:none;">
			<div class="tts-player-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0" title="<?php esc_attr_e( 'Click or drag to seek', 'text-to-speech-player' ); ?>" aria-label="<?php esc_attr_e( 'Audio progress track', 'text-to-speech-player' ); ?>">
				<div class="tts-player-progress-fill" style="width: 0%;"></div>
				<div class="tts-player-progress-handle" style="left: 0%;"></div>
			</div>
		</div>

		<div class="tts-player-controls" style="display:none;">
			<button type="button" class="tts-player-skip tts-skip-back" title="<?php esc_attr_e( 'Rewind 10 seconds', 'text-to-speech-player' ); ?>" aria-label="<?php esc_attr_e( 'Rewind 10 seconds', 'text-to-speech-player' ); ?>">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.2 3.16-1.98 5.12-1.98 3.53 0 6.47 2.37 7.37 5.61l2.42-.79C20.93 11.23 17.08 8 12.5 8z"/>
				</svg>
			</button>

			<button type="button" class="tts-player-skip tts-skip-forward" title="<?php esc_attr_e( 'Forward 10 seconds', 'text-to-speech-player' ); ?>" aria-label="<?php esc_attr_e( 'Forward 10 seconds', 'text-to-speech-player' ); ?>">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
					<path d="M11.5 8c2.65 0 5.05.99 6.9 2.6L22 7v9h-9l3.62-3.62c-1.39-1.2-3.16-1.98-5.12-1.98-3.53 0-6.47 2.37-7.37 5.61l-2.42-.79C3.07 11.23 6.92 8 11.5 8z"/>
				</svg>
			</button>

			<button type="button" class="tts-player-speed" title="<?php esc_attr_e( 'Change playback speed', 'text-to-speech-player' ); ?>"><?php echo esc_html( $default_rate . 'x' ); ?></button>
			<span class="tts-player-timer">0:00</span>

			<?php if ( ! empty( $custom_mp3 ) && $enable_download ) : ?>
				<a href="<?php echo esc_url( $custom_mp3 ); ?>" download class="tts-player-download" title="<?php esc_attr_e( 'Download audio MP3', 'text-to-speech-player' ); ?>" aria-label="<?php esc_attr_e( 'Download audio MP3', 'text-to-speech-player' ); ?>">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
					</svg>
				</a>
			<?php endif; ?>
		</div>
	</div>

	<!-- Screen Reader Live Status Region -->
	<div class="screen-reader-text tts-sr-status" aria-live="polite" aria-atomic="true"></div>

	<!-- Hidden raw speakable text payload -->
	<div class="tts-speakable-payload" style="display:none;"
		data-text="<?php echo esc_attr( $speakable_text ); ?>"
		data-body-start="<?php echo esc_attr( $body_start_offset ); ?>"
		data-body-end="<?php echo esc_attr( $body_end_offset ); ?>"
		data-intro="<?php echo esc_attr( $intro_text ); ?>"
		data-outro="<?php echo esc_attr( $outro_text ); ?>"></div>
</div>
<?php
// phpcs:enable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
