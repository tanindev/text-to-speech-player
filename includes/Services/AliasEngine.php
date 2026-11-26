<?php
namespace TextToSpeechPlayer\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Phonetic Alias & Pronunciation Replacement Engine.
 */
class AliasEngine {

	/**
	 * Apply pronunciation alias replacements on text.
	 *
	 * @param string $text Clean text to pronounce.
	 * @return string Modified text.
	 */
	public function apply( $text ) {
		$aliases = get_option( TTS_PLAYER_OPTION_ALIASES, array() );
		if ( empty( $aliases ) || ! is_array( $aliases ) ) {
			return $text;
		}

		foreach ( $aliases as $alias ) {
			if ( empty( $alias['word'] ) || empty( $alias['spoken'] ) ) {
				continue;
			}

			$word   = preg_quote( $alias['word'], '/' );
			$spoken = $alias['spoken'];

			// Match whole words only to prevent partial replacement
			$pattern = '/\b' . $word . '\b/i';
			$text    = preg_replace( $pattern, $spoken, $text );
		}

		return $text;
	}
}
