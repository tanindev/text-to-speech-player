/**
 * Text to Speech Player - Lightweight Frontend Runtime (<15 KB)
 */
import './scss/player.scss';

document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll( '.tts-player-container' );
	if ( ! containers.length ) {
		return;
	}

	// Async Voice Engine Hydration
	let cachedVoices = [];
	function populateVoices() {
		if ( typeof window.speechSynthesis !== 'undefined' ) {
			cachedVoices = window.speechSynthesis.getVoices();
		}
	}
	populateVoices();
	if (
		typeof window.speechSynthesis !== 'undefined' &&
		window.speechSynthesis.onvoiceschanged !== undefined
	) {
		window.speechSynthesis.onvoiceschanged = populateVoices;
	}

	const config = window.ttsPlayerConfig || {};
	const defaultRate =
		typeof config.defaultRate === 'number'
			? config.defaultRate
			: parseFloat( config.defaultRate || 1.0 );
	const enableHighlight = !! (
		config.enableHighlight === true ||
		config.enableHighlight === '1' ||
		config.enableHighlight === 1
	);
	const highlightMode = config.highlightMode || 'word'; // 'word', 'sentence', or 'word_sentence'
	const dimEnabled = !! (
		config.dimEnabled === true ||
		config.dimEnabled === '1' ||
		config.dimEnabled === 1
	);
	const dimOpacity =
		typeof config.dimOpacity === 'number'
			? config.dimOpacity
			: parseFloat( config.dimOpacity || 0.7 );
	const stopOnTabSwitch = !! (
		config.stopOnTabSwitch === true ||
		config.stopOnTabSwitch === '1' ||
		config.stopOnTabSwitch === 1
	);
	const enableSelection = !! (
		config.enableSelection === true ||
		config.enableSelection === '1' ||
		config.enableSelection === 1
	);
	const rates = [ 0.8, 1.0, 1.25, 1.5, 2.0 ];

	if ( ! rates.includes( defaultRate ) ) {
		rates.unshift( defaultRate );
		rates.sort( ( a, b ) => a - b );
	}

	if ( config.highlightColor ) {
		document.documentElement.style.setProperty(
			'--tts-highlight-color',
			config.highlightColor
		);
	}
	if ( config.highlightSentenceBg ) {
		document.documentElement.style.setProperty(
			'--tts-sentence-bg',
			config.highlightSentenceBg
		);
	}
	if ( dimEnabled ) {
		document.documentElement.style.setProperty(
			'--tts-dim-opacity',
			dimOpacity.toString()
		);
	}

	function calculateTotalSeconds( text, rate ) {
		const words = text.trim().split( /\s+/ ).filter( Boolean ).length;
		// 140 words per minute average speaking rate
		return Math.max( 2, Math.round( ( words / ( 140 * rate ) ) * 60 ) );
	}

	function formatTime( seconds ) {
		const mins = Math.floor( seconds / 60 );
		const secs = Math.floor( seconds % 60 );
		return `${ mins }:${ secs < 10 ? '0' : '' }${ secs }`;
	}

	// Active player reference for global tab switch or selection interruption
	let activePlayerPauseFn = null;
	let activePlayerInstance = null;

	// Global Multi-Player Coordination: Only 1 player may play at any time.
	const allPlayers = [];

	function notifyPlayerStarted( activeInstance ) {
		activePlayerInstance = activeInstance;
		allPlayers.forEach( ( player ) => {
			if ( player !== activeInstance ) {
				player.reset();
				player.disable();
			} else {
				player.enable();
			}
		} );
	}

	function notifyPlayerEnded( activeInstance ) {
		allPlayers.forEach( ( player ) => {
			player.enable();
		} );
	}

	// Inactivity Tab Switch listener
	if ( stopOnTabSwitch ) {
		document.addEventListener( 'visibilitychange', () => {
			if (
				document.hidden &&
				typeof activePlayerPauseFn === 'function'
			) {
				activePlayerPauseFn();
			}
		} );
	}

	// Setup each player instance
	containers.forEach( ( container ) => {
		const toggleBtn = container.querySelector( '.tts-player-toggle' );
		const labelEl = container.querySelector( '.tts-player-label' );
		const playIcon = container.querySelector( '.tts-icon-play' );
		const pauseIcon = container.querySelector( '.tts-icon-pause' );
		const waveform = container.querySelector( '.tts-player-waveform' );
		const controls = container.querySelector( '.tts-player-controls' );
		const speedBtn = container.querySelector( '.tts-player-speed' );
		const timerEl = container.querySelector( '.tts-player-timer' );
		const payloadEl = container.querySelector( '.tts-speakable-payload' );
		const nativeAudio = container.querySelector( '.tts-native-audio' );
		const progressWrap = container.querySelector(
			'.tts-player-progress-wrap'
		);
		const progressTrack = container.querySelector(
			'.tts-player-progress-track'
		);
		const progressFill = container.querySelector(
			'.tts-player-progress-fill'
		);
		const progressHandle = container.querySelector(
			'.tts-player-progress-handle'
		);
		const skipBackBtn = container.querySelector( '.tts-skip-back' );
		const skipFwdBtn = container.querySelector( '.tts-skip-forward' );
		const srStatusEl = container.querySelector( '.tts-sr-status' );

		const postTitle =
			container.getAttribute( 'data-post-title' ) ||
			config.postTitle ||
			document.title;
		const featuredImage =
			container.getAttribute( 'data-featured-image' ) ||
			config.featuredImage ||
			'';

		// Screen Reader Accessibility Announcement
		function announceSR( message ) {
			if ( srStatusEl ) {
				srStatusEl.textContent = message;
			}
		}

		// Smart Theme Container Auto-Detection & Priority Resolution
		function findContentRoot( playerContainer, cfg ) {
			// 1. If user provided custom CSS selectors in settings, test each one first
			if ( cfg.cssSelectors ) {
				const customSels = cfg.cssSelectors
					.split( ',' )
					.map( ( s ) => s.trim() )
					.filter( Boolean );
				for ( const sel of customSels ) {
					try {
						const el = document.querySelector( sel );
						if ( el ) {
							return el;
						}
					} catch ( e ) {}
				}
			}

			// 2. If theme preset is explicitly configured
			if ( cfg.themePreset && cfg.themePreset !== 'auto' ) {
				const presetMap = {
					astra: [ '.ast-single-post', '.entry-content' ],
					generatepress: [ '.inside-article', '.entry-content' ],
					kadence: [ '.single-content', '.entry-content' ],
					elementor: [
						'.elementor-widget-theme-post-content',
						'.entry-content',
					],
					divi: [ '.et_pb_post_content', '.entry-content' ],
				};
				const presetSelectors = presetMap[ cfg.themePreset ] || [];
				for ( const sel of presetSelectors ) {
					const el = document.querySelector( sel );
					if ( el ) {
						return el;
					}
				}
			}

			// 3. If player is placed inline inside article content, use closest content wrapper
			const inlineRoot = playerContainer.closest(
				'.entry-content, .dynamic-post-content, .article-body, .article-content, .post-content, .post__content, .wp-block-post-content'
			);
			if ( inlineRoot ) {
				return inlineRoot;
			}

			// 4. Priority-ordered search: specific post body containers FIRST.
			// IMPORTANT: We test each selector sequentially rather than using a single comma-separated
			// query string (e.g. '.entry-content, article, main'). A comma-separated query causes the browser
			// to evaluate in DOM tree order, returning broad wrapper elements (<main> or <article>) that wrap
			// breadcrumbs, page headers, dates, and author meta before the actual post body.
			const priorityBodySelectors = [
				'.dynamic-post-content',
				'.entry-content',
				'.article-body',
				'.article-content',
				'.post-content',
				'.post__content',
				'.wp-block-post-content',
				'.single-content',
				'.inside-article',
				'.ast-single-post',
				'.elementor-widget-theme-post-content',
				'.et_pb_post_content',
				'[itemprop="articleBody"]',
				'article .content',
				'article .entry-content',
			];

			for ( const sel of priorityBodySelectors ) {
				const el = document.querySelector( sel );
				if ( el ) {
					return el;
				}
			}

			// 5. Fallback: <article> tag (avoiding product or pricing cards)
			const articleEl =
				document.querySelector(
					'article:not(.pricing-card):not(.product-card):not(.post-card)'
				) || document.querySelector( 'article' );
			if ( articleEl ) {
				return articleEl;
			}

			// 6. Fallback: <main> tag
			const mainEl = document.querySelector( 'main' );
			if ( mainEl ) {
				return mainEl;
			}

			return playerContainer.parentElement || document.body;
		}

		// Content Root Container for Highlighting & Dimming
		let contentRoot = findContentRoot( container, config );

		// Read raw text and content boundary offsets
		let rawText = payloadEl
			? payloadEl.getAttribute( 'data-text' ) || ''
			: '';
		let bodyStartOffset = parseInt(
			payloadEl
				? payloadEl.getAttribute( 'data-body-start' ) || '0'
				: '0',
			10
		);
		let bodyEndOffset =
			parseInt(
				payloadEl
					? payloadEl.getAttribute( 'data-body-end' ) || '0'
					: '0',
				10
			) || ( rawText ? rawText.length : 0 );

		if ( ( ! rawText.trim() || config.readFromDom ) && contentRoot ) {
			// DOM reading fallback
			const clone = contentRoot.cloneNode( true );
			clone
				.querySelectorAll(
					'.tts-player-container, script, style, noscript, svg, form, button'
				)
				.forEach( ( el ) => el.remove() );
			// Insert spaces between block-level elements so words don't collapse across tags (e.g. <p>A</p><p>B</p> -> "A B")
			clone
				.querySelectorAll(
					'p, div, h1, h2, h3, h4, h5, h6, li, tr, td, th, section, article, blockquote'
				)
				.forEach( ( el ) => {
					el.appendChild( document.createTextNode( ' ' ) );
				} );
			rawText = clone.textContent.replace( /\s+/g, ' ' ).trim();
			bodyStartOffset = 0;
			bodyEndOffset = rawText.length;
		}

		if ( ! rawText.trim() && ! nativeAudio ) {
			return;
		}

		// Multi-state button text strings
		const textListen =
			container.getAttribute( 'data-listen-text' ) ||
			config.listenText ||
			'Listen to this article';
		const textPause =
			container.getAttribute( 'data-pause-text' ) ||
			config.pauseText ||
			'Pause';
		const textResume =
			container.getAttribute( 'data-resume-text' ) ||
			config.resumeText ||
			'Resume';
		const textReplay =
			container.getAttribute( 'data-replay-text' ) ||
			config.replayText ||
			'Listen again';

		let isPlaying = false;
		let isPaused = false;
		let currentRateIdx =
			rates.indexOf( defaultRate ) !== -1
				? rates.indexOf( defaultRate )
				: rates.indexOf( 1.0 ) !== -1
				? rates.indexOf( 1.0 )
				: 0;
		let utterance = null;
		let timerInterval = null;
		let elapsedSeconds = 0;
		let currentProgressPct = 0;
		let currentCharOffset = 0;
		let maxReachedCharOffset = 0;
		let lastBoundaryTimestamp = 0;
		let startTimestamp = 0;
		let totalSeconds = calculateTotalSeconds(
			rawText,
			rates[ currentRateIdx ]
		);

		// Read-Along Highlighting Structures
		let domWords = []; // { span, text, clean, sentenceIdx }
		let domSentenceMap = new Map(); // sentenceIdx => Array of .tts-sentence elements
		let currentActiveWordSpan = null;
		let currentActiveSentenceIdx = -1;
		let cumulativeShift = 0;
		let lastMatchedDomIdx = -1;
		const wordsInRawText = [];
		const contentWords = []; // Only words belonging to the main article DOM body

		function cleanToken( str ) {
			return str.toLowerCase().replace( /[^\p{L}\p{N}]/gu, '' );
		}

		if ( enableHighlight ) {
			// Index words in raw text with boundary tagging
			const wordRegex = /\S+/g;
			let wm;
			while ( ( wm = wordRegex.exec( rawText ) ) !== null ) {
				const wStart = wm.index;
				const wEnd = wm.index + wm[ 0 ].length;
				const isContent =
					wStart >= bodyStartOffset && wStart < bodyEndOffset;
				const wordObj = {
					start: wStart,
					end: wEnd,
					text: wm[ 0 ],
					clean: cleanToken( wm[ 0 ] ),
					isContent,
					contentWordIdx: isContent ? contentWords.length : -1,
				};
				wordsInRawText.push( wordObj );
				if ( isContent ) {
					contentWords.push( wordObj );
				}
			}
		}

		function prepareContentSpans() {
			if ( ! enableHighlight || ! contentRoot || domWords.length > 0 ) {
				return;
			}

			// If spans are already present in contentRoot (from another player instance), reuse them directly
			const existingWords = contentRoot.querySelectorAll( '.tts-word' );
			if ( existingWords.length > 0 ) {
				domWords = [];
				domSentenceMap.clear();
				existingWords.forEach( ( wSpan ) => {
					const sIdx = parseInt( wSpan.dataset.sentence || '0', 10 );
					domWords.push( {
						span: wSpan,
						text: wSpan.textContent,
						clean: cleanToken( wSpan.textContent ),
						sentenceIdx: sIdx,
					} );
					const sParent = wSpan.closest( '.tts-sentence' );
					if ( sParent ) {
						if ( ! domSentenceMap.has( sIdx ) ) {
							domSentenceMap.set( sIdx, [] );
						}
						if (
							! domSentenceMap.get( sIdx ).includes( sParent )
						) {
							domSentenceMap.get( sIdx ).push( sParent );
						}
					}
				} );
				return;
			}

			// Add highlight mode class to contentRoot for CSS targeting
			contentRoot.classList.remove(
				'tts-highlight-mode-word',
				'tts-highlight-mode-sentence',
				'tts-highlight-mode-word_sentence'
			);
			contentRoot.classList.add(
				`tts-highlight-mode-${ highlightMode }`
			);

			// Build dynamic exclusion selector from settings
			let excludeSelector =
				'.tts-player-container, script, style, noscript, svg, button, form, nav, .breadcrumbs, .breadcrumb, header, .entry-header, .post-header, .page-header, .entry-meta, .post-meta, .byline, .author-box, .wp-block-post-date, .wp-block-post-author, .wp-block-post-terms, .toc, .table-of-contents, .sidebar, aside, footer, .entry-footer, .post-footer, .comments-area';
			if ( config.excludeTags ) {
				const tags = config.excludeTags
					.split( /[,|]/ )
					.map( ( t ) => t.trim().toLowerCase() )
					.filter( Boolean );
				if ( tags.length ) {
					excludeSelector += ', ' + tags.join( ', ' );
				}
			}
			if ( config.excludeSelectors ) {
				const sels = config.excludeSelectors
					.split( /[,|]/ )
					.map( ( s ) => s.trim() )
					.filter( Boolean );
				if ( sels.length ) {
					excludeSelector += ', ' + sels.join( ', ' );
				}
			}

			// TreeWalker to visit only content text nodes
			const walker = document.createTreeWalker(
				contentRoot,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode( node ) {
						if ( ! node.textContent.trim() ) {
							return NodeFilter.FILTER_REJECT;
						}
						if (
							node.parentElement &&
							( node.parentElement.closest( excludeSelector ) ||
								node.parentElement.closest(
									'.tts-word, .tts-sentence'
								) )
						) {
							return NodeFilter.FILTER_REJECT;
						}
						// Skip unrendered shortcode bracket tags
						if (
							/^\[\/?[\w\-:]+(?:\s+[^\]]*)?\]$/.test(
								node.textContent.trim()
							)
						) {
							return NodeFilter.FILTER_REJECT;
						}
						return NodeFilter.FILTER_ACCEPT;
					},
				}
			);

			const textNodes = [];
			while ( walker.nextNode() ) {
				textNodes.push( walker.currentNode );
			}

			function getBlockParent( node ) {
				let curr = node.parentElement;
				while ( curr && curr !== contentRoot ) {
					const display = window.getComputedStyle( curr ).display;
					const tag = curr.tagName ? curr.tagName.toLowerCase() : '';
					if (
						/^(p|blockquote|li|dd|dt|h[1-6]|div|section|article|aside|figcaption|table|tr|td|th)$/i.test(
							tag
						) ||
						display === 'block' ||
						display === 'list-item'
					) {
						return curr;
					}
					curr = curr.parentElement;
				}
				return contentRoot;
			}

			function isSentenceTerminal( word ) {
				if (
					/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\.$/i.test(
						word
					)
				) {
					return false;
				}
				return /[.!?]+[\)\]"'”’\u2019\u201d\u00bb]*$/.test( word );
			}

			let currentSentenceIdx = 0;
			let sentenceHasWords = false;
			let lastBlockParent = null;

			textNodes.forEach( ( node ) => {
				const text = node.textContent;
				const currentBlock = getBlockParent( node );

				if (
					lastBlockParent !== null &&
					lastBlockParent !== currentBlock
				) {
					if ( sentenceHasWords ) {
						currentSentenceIdx++;
						sentenceHasWords = false;
					}
				}
				lastBlockParent = currentBlock;

				const tokens = text.match( /\S+|\s+/g ) || [];
				if ( ! tokens.length ) {
					return;
				}

				const fragment = document.createDocumentFragment();
				let currentSentenceSpan = null;

				function ensureSentenceSpan() {
					if (
						! currentSentenceSpan ||
						parseInt(
							currentSentenceSpan.dataset.ttsSentence,
							10
						) !== currentSentenceIdx
					) {
						currentSentenceSpan = document.createElement( 'span' );
						currentSentenceSpan.className = 'tts-sentence';
						currentSentenceSpan.dataset.ttsSentence =
							currentSentenceIdx;
						fragment.appendChild( currentSentenceSpan );

						if ( ! domSentenceMap.has( currentSentenceIdx ) ) {
							domSentenceMap.set( currentSentenceIdx, [] );
						}
						domSentenceMap
							.get( currentSentenceIdx )
							.push( currentSentenceSpan );
					}
					return currentSentenceSpan;
				}

				tokens.forEach( ( tok ) => {
					const sSpan = ensureSentenceSpan();
					if ( ! /\S/.test( tok ) ) {
						// Pure whitespace
						sSpan.appendChild( document.createTextNode( tok ) );
					} else {
						// Word token
						const wordSpan = document.createElement( 'span' );
						wordSpan.className = 'tts-word';
						wordSpan.textContent = tok;
						wordSpan.dataset.sentence = currentSentenceIdx;
						sSpan.appendChild( wordSpan );

						domWords.push( {
							span: wordSpan,
							text: tok,
							clean: cleanToken( tok ),
							sentenceIdx: currentSentenceIdx,
						} );

						sentenceHasWords = true;

						if ( isSentenceTerminal( tok ) ) {
							currentSentenceIdx++;
							sentenceHasWords = false;
						}
					}
				} );

				if ( node.parentNode ) {
					node.parentNode.replaceChild( fragment, node );
				}
			} );

			if ( domSentenceMap.size > 0 && contentRoot ) {
				contentRoot.classList.add( 'tts-has-sentences' );
			}
		}

		function highlightPosition( charIndex ) {
			if ( ! enableHighlight || ! domWords.length ) {
				return;
			}

			// If current speech is speaking INTRO (before content body) or OUTRO (after content body),
			// clear content highlights because intro/outro text is audio-only preface/closing
			if ( charIndex < bodyStartOffset || charIndex >= bodyEndOffset ) {
				clearHighlights();
				return;
			}

			// 1. Locate word within the main article content body
			const searchList =
				contentWords.length > 0 ? contentWords : wordsInRawText;
			let matchedWord = null;
			let contentIdx = -1;

			for ( let i = 0; i < searchList.length; i++ ) {
				const w = searchList[ i ];
				if ( charIndex >= w.start && charIndex < w.end ) {
					matchedWord = w;
					contentIdx = i;
					break;
				}
				if ( w.start > charIndex ) {
					contentIdx = Math.max( 0, i - 1 );
					matchedWord = searchList[ contentIdx ];
					break;
				}
			}
			if ( ! matchedWord && searchList.length > 0 ) {
				if ( charIndex >= searchList[ searchList.length - 1 ].start ) {
					contentIdx = searchList.length - 1;
					matchedWord = searchList[ contentIdx ];
				} else {
					contentIdx = 0;
					matchedWord = searchList[ 0 ];
				}
			}
			if ( ! matchedWord || contentIdx === -1 ) {
				return;
			}

			const targetClean = matchedWord.clean;
			if ( ! targetClean ) {
				return;
			}

			let matchedDomIdx = -1;

			// 2. Sequential forward-anchored search:
			// Audio narration strictly proceeds forward in time. When playing continuously,
			// anchor to lastMatchedDomIdx to prevent duplicate common words in earlier
			// paragraphs (e.g. "also", "the", "in", "and") from hijacking the highlight.
			if ( lastMatchedDomIdx >= 0 ) {
				// 2a. Check immediate next word (+1) - standard sequential narration path
				if (
					lastMatchedDomIdx + 1 < domWords.length &&
					domWords[ lastMatchedDomIdx + 1 ].clean === targetClean
				) {
					matchedDomIdx = lastMatchedDomIdx + 1;
				}
				// 2b. Check current word (multiple boundary events on same word or syllables)
				else if (
					domWords[ lastMatchedDomIdx ].clean === targetClean
				) {
					matchedDomIdx = lastMatchedDomIdx;
				}
				// 2c. Scan forward up to +10 words (handles stripped URLs, special chars, unrendered spans)
				else {
					const maxLookahead = Math.min(
						domWords.length - 1,
						lastMatchedDomIdx + 10
					);
					for (
						let fwd = lastMatchedDomIdx + 2;
						fwd <= maxLookahead;
						fwd++
					) {
						if ( domWords[ fwd ].clean === targetClean ) {
							matchedDomIdx = fwd;
							break;
						}
					}
				}

				// 2d. Micro-step backward (-1 only) to handle micro timing jitter
				if (
					matchedDomIdx === -1 &&
					lastMatchedDomIdx > 0 &&
					domWords[ lastMatchedDomIdx - 1 ].clean === targetClean
				) {
					matchedDomIdx = lastMatchedDomIdx - 1;
				}
			}

			// 3. Fallback when unanchored (initial start, seek, replay) or if forward lookahead missed:
			// Search radially from estimatedDom, but strictly bound backward search so it cannot
			// jump earlier than (lastMatchedDomIdx - 1).
			if ( matchedDomIdx === -1 ) {
				const estimatedDom = Math.max(
					0,
					Math.min(
						domWords.length - 1,
						contentIdx + cumulativeShift
					)
				);

				const minAllowed =
					lastMatchedDomIdx >= 0
						? Math.max( 0, lastMatchedDomIdx - 1 )
						: 0;

				if (
					estimatedDom >= minAllowed &&
					domWords[ estimatedDom ] &&
					domWords[ estimatedDom ].clean === targetClean
				) {
					matchedDomIdx = estimatedDom;
				} else {
					const maxOffset = 14;
					for ( let offset = 1; offset <= maxOffset; offset++ ) {
						const fwd = estimatedDom + offset;
						if (
							fwd >= minAllowed &&
							fwd < domWords.length &&
							domWords[ fwd ].clean === targetClean
						) {
							matchedDomIdx = fwd;
							break;
						}
						const bwd = estimatedDom - offset;
						if (
							bwd >= minAllowed &&
							domWords[ bwd ].clean === targetClean
						) {
							matchedDomIdx = bwd;
							break;
						}
					}
				}

				if ( matchedDomIdx === -1 ) {
					// Graceful forward advancement fallback: never jump backward when anchored
					if (
						lastMatchedDomIdx >= 0 &&
						lastMatchedDomIdx + 1 < domWords.length
					) {
						matchedDomIdx = lastMatchedDomIdx + 1;
					} else if ( lastMatchedDomIdx >= 0 ) {
						matchedDomIdx = lastMatchedDomIdx;
					} else {
						matchedDomIdx = estimatedDom;
					}
				}
			}

			lastMatchedDomIdx = matchedDomIdx;
			cumulativeShift = matchedDomIdx - contentIdx;

			const activeWordObj = domWords[ matchedDomIdx ];
			if ( ! activeWordObj ) {
				return;
			}

			const wSpan = activeWordObj.span;
			const activeSentenceIdx = activeWordObj.sentenceIdx;

			// Highlight active word
			if ( currentActiveWordSpan !== wSpan ) {
				if ( currentActiveWordSpan ) {
					currentActiveWordSpan.classList.remove( 'tts-word-active' );
				}
				wSpan.classList.add( 'tts-word-active' );
				currentActiveWordSpan = wSpan;

				// Smoothly scroll active word into viewport if offscreen
				const rect = wSpan.getBoundingClientRect();
				if (
					rect.top < 120 ||
					rect.bottom > window.innerHeight - 120
				) {
					wSpan.scrollIntoView( {
						behavior: 'smooth',
						block: 'center',
					} );
				}
			}

			// Synchronize active sentence (for sentence background and focus dimming)
			if ( currentActiveSentenceIdx !== activeSentenceIdx ) {
				if (
					currentActiveSentenceIdx !== -1 &&
					domSentenceMap.has( currentActiveSentenceIdx )
				) {
					domSentenceMap
						.get( currentActiveSentenceIdx )
						.forEach( ( el ) =>
							el.classList.remove( 'tts-sentence-active' )
						);
				}
				if ( domSentenceMap.has( activeSentenceIdx ) ) {
					domSentenceMap
						.get( activeSentenceIdx )
						.forEach( ( el ) =>
							el.classList.add( 'tts-sentence-active' )
						);
				}
				currentActiveSentenceIdx = activeSentenceIdx;
			}
		}

		function clearHighlights() {
			if ( currentActiveWordSpan ) {
				currentActiveWordSpan.classList.remove( 'tts-word-active' );
				currentActiveWordSpan = null;
			}
			if (
				currentActiveSentenceIdx !== -1 &&
				domSentenceMap.has( currentActiveSentenceIdx )
			) {
				domSentenceMap
					.get( currentActiveSentenceIdx )
					.forEach( ( el ) =>
						el.classList.remove( 'tts-sentence-active' )
					);
				currentActiveSentenceIdx = -1;
			}
			if ( dimEnabled && contentRoot ) {
				contentRoot.classList.remove( 'tts-dim-active' );
			}
			lastMatchedDomIdx = -1;
		}

		if ( speedBtn ) {
			speedBtn.textContent = rates[ currentRateIdx ] + 'x';
		}

		function updateProgressDisplay( pct ) {
			if ( typeof pct === 'number' ) {
				currentProgressPct = Math.min( 100, Math.max( 0, pct ) );
			} else if ( totalSeconds > 0 ) {
				currentProgressPct = Math.min(
					100,
					Math.max( 0, ( elapsedSeconds / totalSeconds ) * 100 )
				);
			}
			if ( progressFill ) {
				progressFill.style.width = currentProgressPct + '%';
			}
			if ( progressHandle ) {
				progressHandle.style.left = currentProgressPct + '%';
			}
			if ( progressTrack ) {
				progressTrack.setAttribute(
					'aria-valuenow',
					Math.round( currentProgressPct )
				);
			}
		}

		function updateTimerDisplay() {
			if ( timerEl ) {
				timerEl.textContent = `${ formatTime(
					elapsedSeconds
				) } / ${ formatTime( totalSeconds ) }`;
			}
			updateProgressDisplay();
		}

		updateTimerDisplay();

		// Web Speech API Heartbeat (Chrome 15s freeze fix)
		let heartbeatInterval = null;
		function startHeartbeat() {
			stopHeartbeat();
			heartbeatInterval = setInterval( () => {
				if (
					! isPlaying ||
					isPaused ||
					typeof window.speechSynthesis === 'undefined'
				) {
					stopHeartbeat();
					return;
				}
				if (
					window.speechSynthesis.speaking &&
					! window.speechSynthesis.paused
				) {
					window.speechSynthesis.pause();
					window.speechSynthesis.resume();
				}
			}, 10000 );
		}

		function stopHeartbeat() {
			if ( heartbeatInterval ) {
				clearInterval( heartbeatInterval );
				heartbeatInterval = null;
			}
		}

		// Lock-screen & Bluetooth MediaSession API Integration
		function updateMediaSession( state ) {
			if ( ! ( 'mediaSession' in navigator ) ) return;
			navigator.mediaSession.playbackState = state;

			if ( state === 'playing' ) {
				if ( window.MediaMetadata ) {
					navigator.mediaSession.metadata = new MediaMetadata( {
						title: postTitle,
						artist: config.siteTitle || window.location.hostname,
						album: 'Article Narration',
						artwork: featuredImage
							? [
									{
										src: featuredImage,
										sizes: '512x512',
										type: 'image/jpeg',
									},
							  ]
							: [],
					} );
				}

				navigator.mediaSession.setActionHandler( 'play', () => {
					if ( ! isPlaying ) startPlayback();
				} );
				navigator.mediaSession.setActionHandler( 'pause', () => {
					if ( isPlaying ) pausePlayback();
				} );
				navigator.mediaSession.setActionHandler(
					'seekforward',
					( details ) => {
						seekRelative( details.seekOffset || 10 );
					}
				);
				navigator.mediaSession.setActionHandler(
					'seekbackward',
					( details ) => {
						seekRelative( -( details.seekOffset || 10 ) );
					}
				);
				navigator.mediaSession.setActionHandler( 'stop', () => {
					pausePlayback();
					playerInstance.reset();
				} );
			}
		}

		let isSeeking = false;
		let seekDebounceTimer = null;

		function getWordBoundaryCharOffset( targetCharIdx ) {
			if ( ! wordsInRawText.length ) {
				return targetCharIdx;
			}
			let bestOffset = 0;
			for ( let i = 0; i < wordsInRawText.length; i++ ) {
				if ( wordsInRawText[ i ].start <= targetCharIdx ) {
					bestOffset = wordsInRawText[ i ].start;
				} else {
					break;
				}
			}
			return bestOffset;
		}

		// Seek to specific fraction of content (0.0 to 1.0)
		function seekToRatio( ratio ) {
			ratio = Math.max( 0, Math.min( 1, ratio ) );
			const targetSeconds = Math.round( ratio * totalSeconds );
			const targetPct = ratio * 100;
			elapsedSeconds = targetSeconds;
			updateProgressDisplay( targetPct );
			if ( timerEl ) {
				timerEl.textContent = `${ formatTime(
					elapsedSeconds
				) } / ${ formatTime( totalSeconds ) }`;
			}
			lastMatchedDomIdx = -1;

			// Clean handling if scrubbed to the very end
			if (
				ratio >= 0.995 ||
				( totalSeconds > 0 && targetSeconds >= totalSeconds )
			) {
				if ( nativeAudio ) {
					nativeAudio.currentTime = totalSeconds;
				} else if ( typeof window.speechSynthesis !== 'undefined' ) {
					window.speechSynthesis.cancel();
				}
				isPlaying = false;
				isPaused = false;
				stopHeartbeat();
				updateMediaSession( 'none' );
				clearInterval( timerInterval );
				clearHighlights();
				currentCharOffset = rawText.length;
				maxReachedCharOffset = rawText.length;
				elapsedSeconds = totalSeconds;
				updateProgressDisplay( 100 );
				updateTimerDisplay();
				setButtonState( 'ended' );
				updateUI();
				notifyPlayerEnded( playerInstance );
				return;
			}

			if ( nativeAudio ) {
				nativeAudio.currentTime = targetSeconds;
			} else if ( typeof window.speechSynthesis !== 'undefined' ) {
				let targetCharIdx = Math.floor( ratio * rawText.length );
				targetCharIdx = getWordBoundaryCharOffset( targetCharIdx );
				currentCharOffset = targetCharIdx;
				maxReachedCharOffset = targetCharIdx;
				startTimestamp =
					Date.now() -
					( elapsedSeconds / rates[ currentRateIdx ] ) * 1000;

				if ( isPlaying ) {
					isSeeking = true;
					clearTimeout( seekDebounceTimer );
					window.speechSynthesis.cancel();
					clearHighlights();

					seekDebounceTimer = setTimeout( () => {
						isSeeking = false;
						if ( isPlaying ) {
							startSpeech(
								rates[ currentRateIdx ],
								currentCharOffset,
								elapsedSeconds
							);
						}
					}, 60 );
				} else {
					// Highlight word at seek position so user sees where they scrubbed
					highlightPosition( currentCharOffset );
				}
			}
		}

		function seekRelative( offsetSeconds ) {
			if ( totalSeconds <= 0 ) return;
			const targetSecs = Math.max(
				0,
				Math.min( totalSeconds, elapsedSeconds + offsetSeconds )
			);
			seekToRatio( targetSecs / totalSeconds );
		}

		// Wire up Seek Scrubber and Skip Controls
		if ( skipBackBtn ) {
			skipBackBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				skipBackBtn.blur();
				seekRelative( -10 );
			} );
		}

		if ( skipFwdBtn ) {
			skipFwdBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				skipFwdBtn.blur();
				seekRelative( 10 );
			} );
		}

		if ( progressWrap && progressTrack ) {
			let isDragging = false;
			let dragRatio = 0;

			function getRatioFromEvent( e ) {
				const rect = progressTrack.getBoundingClientRect();
				const clientX =
					e.clientX !== undefined
						? e.clientX
						: e.touches && e.touches[ 0 ]
						? e.touches[ 0 ].clientX
						: rect.left;
				return Math.max(
					0,
					Math.min( 1, ( clientX - rect.left ) / rect.width )
				);
			}

			function onDragMove( e ) {
				if ( ! isDragging ) return;
				dragRatio = getRatioFromEvent( e );
				// Update scrubber visual display without restarting audio on every pixel
				updateProgressDisplay( dragRatio * 100 );
				const previewSeconds = Math.round( dragRatio * totalSeconds );
				if ( timerEl ) {
					timerEl.textContent = `${ formatTime(
						previewSeconds
					) } / ${ formatTime( totalSeconds ) }`;
				}
				if ( enableHighlight && rawText.length > 0 ) {
					const previewChar = getWordBoundaryCharOffset(
						Math.floor( dragRatio * rawText.length )
					);
					highlightPosition( previewChar );
				}
			}

			function onDragEnd() {
				if ( ! isDragging ) return;
				isDragging = false;
				progressTrack.classList.remove( 'tts-is-scrubbing' );
				document.removeEventListener( 'mousemove', onDragMove );
				document.removeEventListener( 'mouseup', onDragEnd );
				document.removeEventListener( 'touchmove', onDragMove );
				document.removeEventListener( 'touchend', onDragEnd );
				seekToRatio( dragRatio );
			}

			function onDragStart( e ) {
				e.stopPropagation();
				isDragging = true;
				lastMatchedDomIdx = -1;
				progressTrack.classList.add( 'tts-is-scrubbing' );
				dragRatio = getRatioFromEvent( e );
				updateProgressDisplay( dragRatio * 100 );
				const previewSeconds = Math.round( dragRatio * totalSeconds );
				if ( timerEl ) {
					timerEl.textContent = `${ formatTime(
						previewSeconds
					) } / ${ formatTime( totalSeconds ) }`;
				}
				document.addEventListener( 'mousemove', onDragMove );
				document.addEventListener( 'mouseup', onDragEnd );
				document.addEventListener( 'touchmove', onDragMove, {
					passive: true,
				} );
				document.addEventListener( 'touchend', onDragEnd );
			}

			progressWrap.addEventListener( 'mousedown', onDragStart );
			progressWrap.addEventListener( 'touchstart', onDragStart, {
				passive: true,
			} );

			// Click on wrap immediately seeks
			progressWrap.addEventListener( 'click', ( e ) => {
				e.stopPropagation();
				const ratio = getRatioFromEvent( e );
				seekToRatio( ratio );
			} );

			progressTrack.addEventListener( 'keydown', ( e ) => {
				if ( e.key === 'ArrowRight' ) {
					e.preventDefault();
					seekRelative( 5 );
				} else if ( e.key === 'ArrowLeft' ) {
					e.preventDefault();
					seekRelative( -5 );
				}
			} );
		}

		function setButtonState( state ) {
			if ( ! labelEl ) return;
			switch ( state ) {
				case 'playing':
					labelEl.textContent = textPause;
					toggleBtn.setAttribute( 'aria-label', textPause );
					toggleBtn.setAttribute( 'title', textPause );
					break;
				case 'paused':
					labelEl.textContent = textResume;
					toggleBtn.setAttribute( 'aria-label', textResume );
					toggleBtn.setAttribute( 'title', textResume );
					break;
				case 'ended':
					labelEl.textContent = textReplay;
					toggleBtn.setAttribute( 'aria-label', textReplay );
					toggleBtn.setAttribute( 'title', textReplay );
					break;
				case 'ready':
				default:
					labelEl.textContent = textListen;
					toggleBtn.setAttribute( 'aria-label', textListen );
					toggleBtn.setAttribute( 'title', textListen );
					break;
			}
		}

		function startTimer() {
			clearInterval( timerInterval );
			const currentRate = rates[ currentRateIdx ];
			totalSeconds = calculateTotalSeconds( rawText, currentRate );
			startTimestamp =
				Date.now() - ( elapsedSeconds / currentRate ) * 1000;
			updateTimerDisplay();

			timerInterval = setInterval( () => {
				if ( isPlaying && ! isPaused ) {
					const now = Date.now();
					const rate = rates[ currentRateIdx ];
					const rawElapsedSecs =
						( ( now - startTimestamp ) / 1000 ) * rate;
					const flooredSecs = Math.floor( rawElapsedSecs );

					// Monotonic digital clock update: never pull backwards
					if (
						flooredSecs > elapsedSeconds &&
						flooredSecs <= totalSeconds
					) {
						elapsedSeconds = flooredSecs;
						if ( timerEl ) {
							timerEl.textContent = `${ formatTime(
								elapsedSeconds
							) } / ${ formatTime( totalSeconds ) }`;
						}
					}

					// Monotonic smooth progress bar update
					if ( totalSeconds > 0 ) {
						const rawPct = ( rawElapsedSecs / totalSeconds ) * 100;
						if ( rawPct > currentProgressPct && rawPct <= 100 ) {
							updateProgressDisplay( rawPct );
						}
					}

					// Fallback highlight progress only if onboundary hasn't fired in >1.5s
					if (
						enableHighlight &&
						domWords.length > 0 &&
						totalSeconds > 0 &&
						Date.now() - lastBoundaryTimestamp > 1500
					) {
						const progressRatio = elapsedSeconds / totalSeconds;
						const estRawIdx = Math.min(
							wordsInRawText.length - 1,
							Math.floor( progressRatio * wordsInRawText.length )
						);
						const charIdx = wordsInRawText[ estRawIdx ]
							? wordsInRawText[ estRawIdx ].start
							: 0;
						highlightPosition( charIdx );
					}

					if ( elapsedSeconds >= totalSeconds ) {
						clearInterval( timerInterval );
					}
				}
			}, 250 );
		}

		function pauseTimer() {
			clearInterval( timerInterval );
		}

		// ==========================================
		// Native MP3 Audio File Playback Handler
		// ==========================================
		if ( nativeAudio ) {
			nativeAudio.addEventListener( 'loadedmetadata', () => {
				if (
					! isNaN( nativeAudio.duration ) &&
					nativeAudio.duration > 0
				) {
					totalSeconds = Math.round( nativeAudio.duration );
					updateTimerDisplay();
				}
			} );

			nativeAudio.addEventListener( 'timeupdate', () => {
				elapsedSeconds = Math.floor( nativeAudio.currentTime );
				if (
					! isNaN( nativeAudio.duration ) &&
					nativeAudio.duration > 0
				) {
					totalSeconds = Math.round( nativeAudio.duration );
					const pct =
						( nativeAudio.currentTime / nativeAudio.duration ) *
						100;
					updateProgressDisplay( pct );
				}
				if ( timerEl ) {
					timerEl.textContent = `${ formatTime(
						elapsedSeconds
					) } / ${ formatTime( totalSeconds ) }`;
				}

				// Synchronize highlighting with MP3 audio playback
				if (
					enableHighlight &&
					domWords.length > 0 &&
					totalSeconds > 0
				) {
					const progressRatio =
						nativeAudio.currentTime / totalSeconds;
					const estRawIdx = Math.min(
						wordsInRawText.length - 1,
						Math.floor( progressRatio * wordsInRawText.length )
					);
					const charIdx = wordsInRawText[ estRawIdx ]
						? wordsInRawText[ estRawIdx ].start
						: 0;
					highlightPosition( charIdx );
				}
			} );

			nativeAudio.addEventListener( 'ended', () => {
				isPlaying = false;
				isPaused = false;
				stopHeartbeat();
				updateMediaSession( 'none' );
				announceSR( config.srEnded || 'Audio playback completed' );
				clearHighlights();
				setButtonState( 'ended' );
				updateUI();
				trackEvent( 'complete' );
				notifyPlayerEnded( playerInstance );
			} );
		}

		function pausePlayback() {
			if ( nativeAudio ) {
				nativeAudio.pause();
			} else if ( typeof window.speechSynthesis !== 'undefined' ) {
				window.speechSynthesis.cancel();
			}
			stopHeartbeat();
			isPlaying = false;
			isPaused = true;
			pauseTimer();
			setButtonState( 'paused' );
			updateMediaSession( 'paused' );
			announceSR( config.srPaused || 'Audio playback paused' );
			updateUI();
			notifyPlayerEnded( playerInstance );
		}

		// Multi-Player Coordination: Player Instance Registration
		const playerInstance = {
			container,
			toggleBtn,
			isDisabled: false,
			isPlaying() {
				return isPlaying;
			},
			isPaused() {
				return isPaused;
			},
			play() {
				startPlayback();
			},
			pause() {
				pausePlayback();
			},
			seekRelative( offsetSeconds ) {
				seekRelative( offsetSeconds );
			},
			disable() {
				playerInstance.isDisabled = true;
				container.classList.add( 'tts-player-disabled' );
				if ( toggleBtn ) {
					toggleBtn.disabled = true;
					toggleBtn.setAttribute( 'aria-disabled', 'true' );
					toggleBtn.setAttribute(
						'title',
						config.otherPlayerPlaying ||
							'Another audio player is currently playing'
					);
				}
			},
			enable() {
				playerInstance.isDisabled = false;
				container.classList.remove( 'tts-player-disabled' );
				if ( toggleBtn ) {
					toggleBtn.disabled = false;
					toggleBtn.removeAttribute( 'aria-disabled' );
					const curLabel =
						labelEl && labelEl.textContent
							? labelEl.textContent
							: textListen;
					toggleBtn.setAttribute( 'title', curLabel );
				}
			},
			reset() {
				if ( nativeAudio ) {
					nativeAudio.pause();
					nativeAudio.currentTime = 0;
				}
				stopHeartbeat();
				updateMediaSession( 'none' );
				isPlaying = false;
				isPaused = false;
				pauseTimer();
				clearHighlights();
				currentCharOffset = 0;
				maxReachedCharOffset = 0;
				elapsedSeconds = 0;
				updateProgressDisplay( 0 );
				updateTimerDisplay();
				setButtonState( 'ready' );
				updateUI();
			},
		};
		allPlayers.push( playerInstance );

		// 1. Play / Pause Toggle
		toggleBtn.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			toggleBtn.blur();
			if ( playerInstance.isDisabled ) {
				return;
			}
			if ( isPlaying ) {
				pausePlayback();
			} else {
				startPlayback();
			}
		} );

		toggleBtn.addEventListener( 'keydown', ( e ) => {
			if ( e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter' ) {
				e.preventDefault();
				toggleBtn.blur();
				if ( ! playerInstance.isDisabled ) {
					if ( isPlaying ) {
						pausePlayback();
					} else {
						startPlayback();
					}
				}
			}
		} );

		// 2. Playback Speed Selector
		if ( speedBtn ) {
			speedBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				currentRateIdx = ( currentRateIdx + 1 ) % rates.length;
				const newRate = rates[ currentRateIdx ];
				speedBtn.textContent = newRate + 'x';

				if ( nativeAudio ) {
					nativeAudio.playbackRate = newRate;
				} else {
					totalSeconds = calculateTotalSeconds( rawText, newRate );
					// Preserve percentage through content
					const progressRatio =
						rawText.length > 0
							? currentCharOffset / rawText.length
							: 0;
					elapsedSeconds = Math.min(
						totalSeconds,
						Math.round( progressRatio * totalSeconds )
					);
					startTimestamp =
						Date.now() - ( elapsedSeconds / newRate ) * 1000;
					updateProgressDisplay( progressRatio * 100 );
					updateTimerDisplay();

					if ( isPlaying ) {
						window.speechSynthesis.cancel();
						clearHighlights();
						startSpeech(
							newRate,
							currentCharOffset,
							elapsedSeconds
						);
					}
				}
			} );
		}

		// 3. Start Playback (MP3 or Web Speech)
		function startPlayback() {
			if ( nativeAudio ) {
				if ( enableHighlight ) {
					prepareContentSpans();
					if ( dimEnabled && contentRoot ) {
						contentRoot.classList.add( 'tts-dim-active' );
					}
				}
				if ( nativeAudio.ended || elapsedSeconds >= totalSeconds ) {
					nativeAudio.currentTime = 0;
					elapsedSeconds = 0;
					cumulativeShift = 0;
				}
				nativeAudio.playbackRate = rates[ currentRateIdx ];
				nativeAudio
					.play()
					.then( () => {
						notifyPlayerStarted( playerInstance );
						isPlaying = true;
						isPaused = false;
						activePlayerPauseFn = pausePlayback;
						setButtonState( 'playing' );
						updateMediaSession( 'playing' );
						announceSR(
							config.srPlaying || 'Audio playback started'
						);
						updateUI();
						trackEvent( 'play' );
					} )
					.catch( () => {
						// Audio autoplay prevented or error
					} );
			} else {
				if (
					( isPaused || currentCharOffset > 0 ) &&
					currentCharOffset < rawText.length
				) {
					startSpeech(
						rates[ currentRateIdx ],
						currentCharOffset,
						elapsedSeconds
					);
				} else {
					currentCharOffset = 0;
					elapsedSeconds = 0;
					updateProgressDisplay( 0 );
					startSpeech( rates[ currentRateIdx ], 0, 0 );
				}
			}
		}

		function startSpeech(
			rate = rates[ currentRateIdx ],
			startCharOffset = 0,
			initialElapsedSeconds = 0
		) {
			if ( typeof window.speechSynthesis === 'undefined' ) {
				return;
			}
			notifyPlayerStarted( playerInstance );
			window.speechSynthesis.cancel();
			clearHighlights();
			cumulativeShift = 0;
			lastMatchedDomIdx = -1;

			currentCharOffset = startCharOffset;
			maxReachedCharOffset = startCharOffset;
			elapsedSeconds = initialElapsedSeconds;
			lastBoundaryTimestamp = Date.now();

			const initialPct =
				totalSeconds > 0
					? ( initialElapsedSeconds / totalSeconds ) * 100
					: 0;
			updateProgressDisplay( initialPct );
			updateTimerDisplay();

			if ( enableHighlight ) {
				prepareContentSpans();
				if ( dimEnabled && contentRoot ) {
					contentRoot.classList.add( 'tts-dim-active' );
				}
			}

			const speakText =
				startCharOffset > 0
					? rawText.substring( startCharOffset )
					: rawText;
			utterance = new SpeechSynthesisUtterance( speakText );
			utterance.rate = rate;
			utterance.pitch =
				typeof config.defaultPitch === 'number'
					? config.defaultPitch
					: parseFloat( config.defaultPitch || 1.0 );

			// Custom voice, language auto-detection, or default voice override
			const voices =
				cachedVoices.length > 0
					? cachedVoices
					: window.speechSynthesis.getVoices();
			if ( config.customVoice ) {
				const target = config.customVoice.trim();
				const match =
					voices.find( ( v ) => v.name === target ) ||
					voices.find(
						( v ) => v.name.toLowerCase() === target.toLowerCase()
					) ||
					voices.find( ( v ) =>
						v.name.toLowerCase().includes( target.toLowerCase() )
					);
				if ( match ) {
					utterance.voice = match;
				}
			} else if ( config.postLocale && voices.length > 0 ) {
				const locPrefix = config.postLocale
					.toLowerCase()
					.substring( 0, 2 );
				const langMatch = voices.find( ( v ) =>
					v.lang
						.toLowerCase()
						.replace( '_', '-' )
						.startsWith( locPrefix )
				);
				if ( langMatch ) {
					utterance.voice = langMatch;
				}
			}

			utterance.onstart = () => {
				isPlaying = true;
				isPaused = false;
				activePlayerPauseFn = pausePlayback;
				setButtonState( 'playing' );
				startTimer();
				startHeartbeat();
				updateMediaSession( 'playing' );
				announceSR( config.srPlaying || 'Audio playback started' );
				updateUI();
				trackEvent( 'play' );
			};

			utterance.onboundary = ( event ) => {
				if (
					typeof event.charIndex === 'number' &&
					rawText.length > 0
				) {
					lastBoundaryTimestamp = Date.now();
					const actualCharIndex = startCharOffset + event.charIndex;

					// Monotonic forward progression guarantee:
					// Reject backward engine glitches during continuous forward playback (e.g. Chromium duplicate word boundary jumps)
					if (
						isPlaying &&
						! isSeeking &&
						actualCharIndex < maxReachedCharOffset - 5
					) {
						return;
					}

					maxReachedCharOffset = Math.max(
						maxReachedCharOffset,
						actualCharIndex
					);
					currentCharOffset = actualCharIndex;
					const ratio = Math.max(
						0,
						Math.min( 1, actualCharIndex / rawText.length )
					);
					const boundarySecs = Math.floor( ratio * totalSeconds );
					const boundaryPct = ratio * 100;

					// Monotonic increase guarantee: never pull time or progress backwards
					if ( boundarySecs > elapsedSeconds ) {
						elapsedSeconds = Math.min( totalSeconds, boundarySecs );
						startTimestamp =
							Date.now() - ( elapsedSeconds / rate ) * 1000;
						if ( timerEl ) {
							timerEl.textContent = `${ formatTime(
								elapsedSeconds
							) } / ${ formatTime( totalSeconds ) }`;
						}
					}

					if ( boundaryPct > currentProgressPct ) {
						updateProgressDisplay( boundaryPct );
					}

					if ( enableHighlight ) {
						highlightPosition( actualCharIndex );
					}
				}
			};

			utterance.onend = () => {
				if ( isSeeking ) {
					return;
				}
				isPlaying = false;
				isPaused = false;
				activePlayerPauseFn = null;
				stopHeartbeat();
				updateMediaSession( 'none' );
				announceSR( config.srEnded || 'Audio playback completed' );
				clearInterval( timerInterval );
				clearHighlights();
				currentCharOffset = rawText.length;
				maxReachedCharOffset = rawText.length;
				elapsedSeconds = totalSeconds;
				updateProgressDisplay( 100 );
				updateTimerDisplay();
				setButtonState( 'ended' );
				updateUI();
				trackEvent( 'complete' );
				notifyPlayerEnded( playerInstance );

				setTimeout( () => {
					if ( ! isPlaying && ! isPaused ) {
						currentCharOffset = 0;
						maxReachedCharOffset = 0;
						elapsedSeconds = 0;
						updateProgressDisplay( 0 );
						updateTimerDisplay();
						setButtonState( 'ready' );
					}
				}, 4000 );
			};

			utterance.onerror = ( err ) => {
				if ( isSeeking ) {
					return;
				}
				stopHeartbeat();
				clearHighlights();
				if (
					err &&
					( err.error === 'interrupted' || err.error === 'canceled' )
				) {
					return;
				}
				isPlaying = false;
				isPaused = false;
				activePlayerPauseFn = null;
				pauseTimer();
				setButtonState( 'ready' );
				updateUI();
				notifyPlayerEnded( playerInstance );
			};

			window.speechSynthesis.speak( utterance );
			isPlaying = true;
			isPaused = false;
			activePlayerPauseFn = pausePlayback;
			setButtonState( 'playing' );
			// Fallback: if utterance.onstart takes >800ms to fire, begin timer so UI responds immediately
			setTimeout( () => {
				if ( isPlaying && ! isPaused && ! timerInterval ) {
					startTimer();
				}
			}, 800 );
			startHeartbeat();
			updateMediaSession( 'playing' );
			announceSR( config.srPlaying || 'Audio playback started' );
			updateUI();
			trackEvent( 'play' );
		}

		// 4. Update UI Elements
		function updateUI() {
			if ( isPlaying ) {
				if ( playIcon ) playIcon.style.display = 'none';
				if ( pauseIcon ) pauseIcon.style.display = 'inline-block';
				if ( waveform ) waveform.style.display = 'flex';
				if ( controls ) controls.style.display = 'flex';
				if ( progressWrap ) progressWrap.style.display = 'flex';
			} else if ( isPaused ) {
				if ( playIcon ) playIcon.style.display = 'inline-block';
				if ( pauseIcon ) pauseIcon.style.display = 'none';
				if ( waveform ) waveform.style.display = 'none';
				if ( controls ) controls.style.display = 'flex';
				if ( progressWrap ) progressWrap.style.display = 'flex';
			} else {
				if ( playIcon ) playIcon.style.display = 'inline-block';
				if ( pauseIcon ) pauseIcon.style.display = 'none';
				if ( waveform ) waveform.style.display = 'none';
				if ( controls ) controls.style.display = 'none';
				if ( progressWrap ) progressWrap.style.display = 'none';
			}
		}

		// 5. Sticky Auto-Docking on Scroll (only if not already permanently sticky)
		if (
			config.enableDock &&
			! container.classList.contains( 'tts-player-sticky' )
		) {
			const dockPosition = config.dockPosition || 'bottom_right';
			const initialTop =
				container.getBoundingClientRect().top + window.scrollY;

			window.addEventListener(
				'scroll',
				() => {
					if ( ! isPlaying ) {
						container.classList.remove(
							'tts-is-docked',
							`tts-dock-${ dockPosition }`
						);
						return;
					}

					if ( window.scrollY > initialTop + 100 ) {
						container.classList.add(
							'tts-is-docked',
							`tts-dock-${ dockPosition }`
						);
					} else {
						container.classList.remove(
							'tts-is-docked',
							`tts-dock-${ dockPosition }`
						);
					}
				},
				{ passive: true }
			);
		}

		// 6. Anonymous Analytics Tracking
		function trackEvent( eventName ) {
			if ( ! config.restUrl || ! config.postId ) return;
			try {
				fetch( `${ config.restUrl }analytics/track`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify( {
						post_id: config.postId,
						event: eventName,
					} ),
				} );
			} catch ( err ) {
				// Suppress tracking errors
			}
		}
	} );

	// ==========================================
	// Unified Global Keyboard Shortcuts (Registered ONCE for all players)
	// ==========================================
	if ( config.enableKeyboard ) {
		window.addEventListener( 'keydown', ( e ) => {
			const activeEl = document.activeElement;
			const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
			if (
				tag === 'input' ||
				tag === 'textarea' ||
				tag === 'select' ||
				( activeEl && activeEl.isContentEditable )
			) {
				return;
			}

			// Identify target player: currently active player > focused player > first enabled player
			let targetPlayer = activePlayerInstance;

			if ( activeEl && activeEl.closest( '.tts-player-container' ) ) {
				const focusedContainer = activeEl.closest(
					'.tts-player-container'
				);
				const matched = allPlayers.find(
					( p ) => p.container === focusedContainer
				);
				if ( matched ) {
					targetPlayer = matched;
				}
			}

			if ( ! targetPlayer && allPlayers.length > 0 ) {
				targetPlayer =
					allPlayers.find( ( p ) => ! p.isDisabled ) ||
					allPlayers[ 0 ];
			}

			if ( ! targetPlayer || targetPlayer.isDisabled ) {
				return;
			}

			if (
				e.key === ' ' ||
				e.key === 'Spacebar' ||
				e.key === 'k' ||
				e.key === 'K'
			) {
				const isInsidePlayer =
					activeEl && activeEl.closest( '.tts-player-container' );
				// Only intercept Space if a player is actively playing/paused, or user focused inside the player
				if (
					targetPlayer.isPlaying() ||
					targetPlayer.isPaused() ||
					isInsidePlayer
				) {
					e.preventDefault();
					if ( activeEl && typeof activeEl.blur === 'function' ) {
						activeEl.blur();
					}
					if ( targetPlayer.isPlaying() ) {
						targetPlayer.pause();
					} else {
						targetPlayer.play();
					}
				}
			} else if ( targetPlayer.isPlaying() || targetPlayer.isPaused() ) {
				if (
					e.key === 'ArrowRight' ||
					e.key === 'l' ||
					e.key === 'L'
				) {
					e.preventDefault();
					targetPlayer.seekRelative( 10 );
				} else if (
					e.key === 'ArrowLeft' ||
					e.key === 'j' ||
					e.key === 'J'
				) {
					e.preventDefault();
					targetPlayer.seekRelative( -10 );
				}
			}
		} );
	}

	// ==========================================
	// Floating Selection Popover Reader
	// ==========================================
	if ( enableSelection && typeof window.speechSynthesis !== 'undefined' ) {
		const popover = document.createElement( 'div' );
		popover.className = 'tts-selection-popover';
		popover.innerHTML =
			'<svg width="14" height="14" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
		const popoverLabel = document.createElement( 'span' );
		popoverLabel.textContent = config.listenText || 'Listen';
		popover.appendChild( popoverLabel );
		document.body.appendChild( popover );

		let selectedTextToSpeak = '';

		document.addEventListener( 'mouseup', ( e ) => {
			if ( popover.contains( e.target ) ) {
				return;
			}

			const selection = window.getSelection();
			const text = selection ? selection.toString().trim() : '';

			if ( text && text.length > 3 ) {
				selectedTextToSpeak = text;
				const range = selection.getRangeAt( 0 );
				const rect = range.getBoundingClientRect();

				if ( rect && rect.width > 0 ) {
					popover.style.display = 'inline-flex';
					popover.style.top = `${ rect.top + window.scrollY - 8 }px`;
					popover.style.left = `${
						rect.left + window.scrollX + rect.width / 2
					}px`;
					return;
				}
			}

			popover.style.display = 'none';
			selectedTextToSpeak = '';
		} );

		popover.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			e.stopPropagation();
			if ( ! selectedTextToSpeak ) return;

			allPlayers.forEach( ( p ) => p.reset() );
			window.speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(
				selectedTextToSpeak
			);
			utterance.rate = defaultRate;

			if ( config.customVoice ) {
				const voices = window.speechSynthesis.getVoices();
				const target = config.customVoice.trim();
				const match =
					voices.find( ( v ) => v.name === target ) ||
					voices.find(
						( v ) => v.name.toLowerCase() === target.toLowerCase()
					);
				if ( match ) utterance.voice = match;
			}

			popover.querySelector( 'span' ).textContent = 'Reading...';
			utterance.onend = () => {
				popover.querySelector( 'span' ).textContent =
					config.listenText || 'Listen';
			};
			utterance.onerror = () => {
				popover.querySelector( 'span' ).textContent =
					config.listenText || 'Listen';
			};

			window.speechSynthesis.speak( utterance );
		} );
	}
} );
