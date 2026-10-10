 AOS.init({
 	duration: 800,
 	easing: 'slide'
 });

(function($) {

	"use strict";

	$(window).stellar({
    responsive: true,
    parallaxBackgrounds: true,
    parallaxElements: true,
    horizontalScrolling: false,
    hideDistantElements: false,
    scrollProperty: 'scroll'
  });


	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	// loader
	var loader = function() {
		setTimeout(function() { 
			if($('#ftco-loader').length > 0) {
				$('#ftco-loader').removeClass('show');
			}
		}, 1);
	};
	loader();

	// Scrollax
   $.Scrollax();

	var carousel = function() {
		// The homepage hero (.home-slider.hero-slider) is NOT an owl carousel
		// anymore: js/hero-slider.js cross-fades it (styles in css/chess.css).
		// Owl would wrap + clone its slides and restart the old blink, so the
		// selector skips it while any other .home-slider keeps working.
		$('.home-slider:not(.hero-slider)').owlCarousel({
	    loop:true,
	    autoplay: true,
	    margin:0,
	    animateOut: 'fadeOut',
	    animateIn: 'fadeIn',
	    nav:false,
	    autoplayHoverPause: false,
	    items: 1,
	    navText : ["<span class='ion-md-arrow-back'></span>","<span class='ion-chevron-right'></span>"],
	    responsive:{
	      0:{
	        items:1
	      },
	      600:{
	        items:1
	      },
	      1000:{
	        items:1
	      }
	    }
		});
		$('.carousel-testimony').owlCarousel({
			autoplay: true,
			center: true,
			loop: true,
			items:1,
			margin: 30,
			stagePadding: 0,
			nav: false,
			navText: ['<span class="ion-ios-arrow-back">', '<span class="ion-ios-arrow-forward">'],
			responsive:{
				0:{
					items: 1
				},
				600:{
					items: 1
				},
				1000:{
					items: 2
				}
			}
		});

	};
	carousel();

	// Keep dropdowns open while the pointer or keyboard focus crosses into the menu.
	$('nav .dropdown').each(function(){
		var $item = $(this);
		var $toggle = $item.children('a').first();
		var $menu = $item.children('.dropdown-menu').first();
		var closeTimer;

		var closeDropdown = function(){
			window.clearTimeout(closeTimer);
			$item.removeClass('show');
			$toggle.attr('aria-expanded', 'false');
			$menu.removeClass('show');
		};
		var openDropdown = function(){
			window.clearTimeout(closeTimer);
			$item.addClass('show');
			$toggle.attr('aria-expanded', 'true');
			$menu.addClass('show');
		};
		var scheduleClose = function(){
			window.clearTimeout(closeTimer);
			closeTimer = window.setTimeout(function(){
				var focusInside = $item.find(':focus').length > 0;
				if (!focusInside && !$item.is(':hover')) {
					closeDropdown();
				}
			}, 280);
		};

		$item.on('mouseenter focusin', openDropdown);
		$item.on('mouseleave focusout', scheduleClose);
		$menu.on('click', 'a', closeDropdown);
		$item.on('keydown', function(event){
			if (event.key === 'Escape' || event.keyCode === 27) {
				closeDropdown();
				$toggle.trigger('focus');
			}
		});
		$(document).on('click.dropdownGuard', function(event){
			if (!$item[0].contains(event.target)) {
				closeDropdown();
			}
		});
	});

	// Attach a real clip only when one has been provided; otherwise keep the
	// colour poster visible rather than requesting a missing media file.
	var heroVideo = document.getElementById('hero-background-video');
	var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (heroVideo && window.fetch && !reducedMotion) {
		var heroVideoSrc = heroVideo.getAttribute('data-video-src');
		if (heroVideoSrc) {
			window.fetch(heroVideoSrc, { method: 'HEAD' }).then(function(response){
				if (!response.ok) return;
				heroVideo.src = heroVideoSrc;
				heroVideo.load();
				var playPromise = heroVideo.play();
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(function(){});
				}
			}).catch(function(){});
		}
	}

	// scroll
	var scrollWindow = function() {
		$(window).scroll(function(){
			var $w = $(this),
					st = $w.scrollTop(),
					navbar = $('.ftco_navbar'),
					sd = $('.js-scroll-wrap');

			if (st > 150) {
				if ( !navbar.hasClass('scrolled') ) {
					navbar.addClass('scrolled');	
				}
			} 
			if (st < 150) {
				if ( navbar.hasClass('scrolled') ) {
					navbar.removeClass('scrolled sleep');
				}
			} 
			if ( st > 350 ) {
				if ( !navbar.hasClass('awake') ) {
					navbar.addClass('awake');	
				}
				
				if(sd.length > 0) {
					sd.addClass('sleep');
				}
			}
			if ( st < 350 ) {
				if ( navbar.hasClass('awake') ) {
					navbar.removeClass('awake');
					navbar.addClass('sleep');
				}
				if(sd.length > 0) {
					sd.removeClass('sleep');
				}
			}
		});
	};
	scrollWindow();

	
	var counter = function() {
		
		$('#section-counter').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {

				var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(',')
				$('.number').each(function(){
					var $this = $(this),
						num = $this.data('number');
						console.log(num);
					$this.animateNumber(
					  {
					    number: num,
					    numberStep: comma_separator_number_step
					  }, 7000
					);
				});
				
			}

		} , { offset: '95%' } );

	}
	counter();

	var contentWayPoint = function() {
		var i = 0;
		$('.ftco-animate').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {
				
				i++;

				$(this.element).addClass('item-animate');
				setTimeout(function(){

					$('body .ftco-animate.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							var effect = el.data('animate-effect');
							if ( effect === 'fadeIn') {
								el.addClass('fadeIn ftco-animated');
							} else if ( effect === 'fadeInLeft') {
								el.addClass('fadeInLeft ftco-animated');
							} else if ( effect === 'fadeInRight') {
								el.addClass('fadeInRight ftco-animated');
							} else {
								el.addClass('fadeInUp ftco-animated');
							}
							el.removeClass('item-animate');
						},  k * 50, 'easeInOutExpo' );
					});
					
				}, 100);
				
			}

		} , { offset: '95%' } );
	};
	contentWayPoint();


	// magnific popup
	$('.image-popup').magnificPopup({
    type: 'image',
    closeOnContentClick: true,
    closeBtnInside: false,
    fixedContentPos: true,
    mainClass: 'mfp-no-margins mfp-with-zoom', // class to remove default margin from left and right side
     gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0,1] // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      verticalFit: true
    },
    zoom: {
      enabled: true,
      duration: 300 // don't foget to change the duration also in CSS
    }
  });

  $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
    disableOn: 700,
    type: 'iframe',
    mainClass: 'mfp-fade',
    removalDelay: 160,
    preloader: false,

    fixedContentPos: false
  });


  $('.appointment_date').datepicker({
	  'format': 'm/d/yyyy',
	  'autoclose': true
	});

	$('.appointment_time').timepicker();




})(jQuery);

