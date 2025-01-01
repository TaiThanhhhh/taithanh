$(window).on('load',function(){
  gsap.to('#loader',1,{y:"-100%"});
  gsap.to('#loader',1,{opacity:0});
  gsap.to('#loader',0,{display:"none",delay:1});
  gsap.to('#header',0,{display:"block",delay:1})
  gsap.to('#navigation-content',0,{display:"none"});
  gsap.to('#navigation-content',0,{display:"flex",delay:1});
})
$(function(){
  $('.color-panel').on("click",function(e) {
    e.preventDefault();
    $('.color-changer').toggleClass('color-changer-active');
});
$('.colors a').on("click",function(e) {
  e.preventDefault();
  var attr = $(this).attr("title");
  console.log(attr);
  $('head').append('<link rel="stylesheet" href="css/'+attr+'.css">');
});
});
$(function(){
     $('.menubar').on('click',function(){
         gsap.to('#navigation-content',.6,{y:0});
     })
     $('.navigation-close').on('click',function(){
        gsap.to('#navigation-content',.6,{y:"-100%"});
    });
   }); 

$(function(){
    var TxtRotate = function(el, toRotate, period) {
        this.toRotate = toRotate;
        this.el = el;
        this.loopNum = 0;
        this.period = parseInt(period, 10) || 2000;
        this.txt = '';
        this.tick();
        this.isDeleting = false;
      };
      
      TxtRotate.prototype.tick = function() {
        var i = this.loopNum % this.toRotate.length;
        var fullTxt = this.toRotate[i];
      
        if (this.isDeleting) {
          this.txt = fullTxt.substring(0, this.txt.length - 1);
        } else {
          this.txt = fullTxt.substring(0, this.txt.length + 1);
        }
      
        this.el.innerHTML = '<span class="wrap">'+this.txt+'</span>';
      
        var that = this;
        var delta = 200 - Math.random() * 100;
      
        if (this.isDeleting) { delta /= 2; }
      
        if (!this.isDeleting && this.txt === fullTxt) {
          delta = this.period;
          this.isDeleting = true;
        } else if (this.isDeleting && this.txt === '') {
          this.isDeleting = false;
          this.loopNum++;
          delta = 100;
        }
      
        setTimeout(function() {
          that.tick();
        }, delta);
      };
      
      window.onload = function() {
        var elements = document.getElementsByClassName('txt-rotate');
        for (var i=0; i<elements.length; i++) {
          var toRotate = elements[i].getAttribute('data-rotate');
          var period = elements[i].getAttribute('data-period');
          if (toRotate) {
            new TxtRotate(elements[i], JSON.parse(toRotate), period);
          }
        }
        // INJECT CSS
        var css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".txt-rotate > .wrap { border-right: 0em solid #666 ; }";
        document.body.appendChild(css);
      };
})
$(function(){

    $('#about-link').on('click',function(){
      gsap.to('#navigation-content',0,{display:"none",delay:.7});
      gsap.to('#navigation-content',0,{y:'-100%',delay:.7});
  gsap.to('#header',0,{display:"none"});
gsap.to('#blog',0,{display:"none"});
gsap.to('#portfolio',0,{display:"none"});
   gsap.to('#breaker',0,{display:"block"});
   gsap.to('#breaker-two',0,{display:"block",delay:.1});
gsap.to('#contact',0,{display:"none"});
   gsap.to('#breaker',0,{display:"none",delay:2});
   gsap.to('#breaker-two',0,{display:"none",delay:2});
   gsap.to('#about',0,{display:"block",delay:.7});
   gsap.to('#navigation-content',0,{display:'flex',delay:2});
 })
 $('#contact-link').on('click',function(){
   gsap.to('#navigation-content',0,{display:"none",delay:.7});
   gsap.to('#navigation-content',0,{y:'-100%',delay:.7});
gsap.to('#header',0,{display:"none"});
gsap.to('#about',0,{display:"none"});
gsap.to('#blog',0,{display:"none"});
gsap.to('#portfolio',0,{display:"none"});
gsap.to('#breaker',0,{display:"block"});
gsap.to('#breaker-two',0,{display:"block",delay:.1});
gsap.to('#breaker',0,{display:"none",delay:2});
gsap.to('#breaker-two',0,{display:"none",delay:2});
gsap.to('#contact',0,{display:"block",delay:.7});
gsap.to('#navigation-content',0,{display:'flex',delay:2});
})
$('#portfolio-link').on('click',function(){
  gsap.to('#navigation-content',0,{display:"none",delay:.7});
  gsap.to('#navigation-content',0,{y:'-100%',delay:.7});
gsap.to('#header',0,{display:"none"});
gsap.to('#about',0,{display:"none"});
gsap.to('#contact',0,{display:"none"});
gsap.to('#blog',0,{display:"none"});
gsap.to('#breaker',0,{display:"block"});
gsap.to('#breaker-two',0,{display:"block",delay:.1});
gsap.to('#breaker',0,{display:"none",delay:2});
gsap.to('#breaker-two',0,{display:"none",delay:2});
gsap.to('#portfolio',0,{display:"block",delay:.7});
gsap.to('#navigation-content',0,{display:'flex',delay:2});
})
$('#blog-link').on('click',function(){
  gsap.to('#navigation-content',0,{display:"none",delay:.7});
  gsap.to('#navigation-content',0,{y:'-100%',delay:.7});
gsap.to('#header',0,{display:"none"});
gsap.to('#about',0,{display:"none"});
gsap.to('#portfolio',0,{display:"none"});
gsap.to('#contact',0,{display:"none"});
gsap.to('#breaker',0,{display:"block"});
gsap.to('#breaker-two',0,{display:"block",delay:.1});
gsap.to('#breaker',0,{display:"none",delay:2});
gsap.to('#breaker-two',0,{display:"none",delay:2});
gsap.to('#blog',0,{display:"block",delay:.7});
gsap.to('#navigation-content',0,{display:'flex',delay:2});
})
$('#home-link').on('click',function(){
  gsap.to('#navigation-content',0,{display:"none",delay:.7});
  gsap.to('#navigation-content',0,{y:'-100%',delay:.7});
gsap.to('#header',0,{display:"none"});
gsap.to('#about',0,{display:"none"});
gsap.to('#portfolio',0,{display:"none"});
gsap.to('#contact',0,{display:"none"});
gsap.to('#blog',0,{display:"none"});
gsap.to('#breaker',0,{display:"block"});
gsap.to('#breaker-two',0,{display:"block",delay:.1});
gsap.to('#breaker',0,{display:"none",delay:2});
gsap.to('#breaker-two',0,{display:"none",delay:2});
gsap.to('#header',0,{display:"block",delay:.7});
gsap.to('#navigation-content',0,{display:'flex',delay:2});
})

})
$(function(){
 var body =  document.querySelector('body');
 var $cursor = $('.cursor')
   function cursormover(e){
    
    gsap.to( $cursor, {
      x : e.clientX ,
      y : e.clientY,
      stagger:.002
     })
   }
   function cursorhover(e){
    gsap.to( $cursor,{
     scale:1.4,
     opacity:1
    })
    
  }
  function cursor(e){
    gsap.to( $cursor, {
     scale:1,
     opacity:.6
    }) 
  }
  $(window).on('mousemove',cursormover);
  $('.menubar').hover(cursorhover,cursor);
  $('a').hover(cursorhover,cursor);
  $('.navigation-close').hover(cursorhover,cursor);

})
// Thêm vào phần $(function(){}) hiện tại
$(function(){
  // Theme panel toggle
  $('.theme-panel').on("click",function(e) {
      e.preventDefault();
      $('.theme-changer').toggleClass('theme-changer-active');
  });

  // Theme switching
  $('.themes a').on("click",function(e) {
      e.preventDefault();
      var theme = $(this).attr("title").toLowerCase();
      
      // Xóa instance particles hiện tại nếu có
      if (window.pJSDom && window.pJSDom.length > 0) {
          window.pJSDom[0].pJS.fn.vendors.destroypJS();
          window.pJSDom = [];
      }

      // Khởi tạo particles mới dựa trên theme
      switch(theme) {
          case 'particles':
              particlesJS("particles", {
                  "particles": {
                      "number": {
                          "value": 40,
                          "density": {
                              "enable": true,
                              "value_area": 800
                          }
                      },
                      "color": {
                          "value": "#ffffff"
                      },
                      "shape": {
                          "type": "circle",
                          "stroke": {
                              "width": 0,
                              "color": "#000000"
                          },
                          "polygon": {
                              "nb_sides": 5
                          }
                      },
                      "opacity": {
                          "value": 0.5,
                          "random": false,
                          "anim": {
                              "enable": false,
                              "speed": 1,
                              "opacity_min": 0.1,
                              "sync": false
                          }
                      },
                      "size": {
                          "value": 3,
                          "random": true,
                          "anim": {
                              "enable": false,
                              "speed": 40,
                              "size_min": 0.1,
                              "sync": false
                          }
                      },
                      "line_linked": {
                          "enable": true,
                          "distance": 150,
                          "color": "#ffffff",
                          "opacity": 0.4,
                          "width": 1
                      },
                      "move": {
                          "enable": true,
                          "speed": 6,
                          "direction": "none",
                          "random": false,
                          "straight": false,
                          "out_mode": "out",
                          "bounce": false,
                          "attract": {
                              "enable": false,
                              "rotateX": 600,
                              "rotateY": 1200
                          }
                      }
                  },
                  "interactivity": {
                      "detect_on": "canvas",
                      "events": {
                          "onhover": {
                              "enable": true,
                              "mode": "repulse"
                          },
                          "onclick": {
                              "enable": true,
                              "mode": "push"
                          },
                          "resize": true
                      },
                      "modes": {
                          "grab": {
                              "distance": 400,
                              "line_linked": {
                                  "opacity": 1
                              }
                          },
                          "bubble": {
                              "distance": 400,
                              "size": 40,
                              "duration": 2,
                              "opacity": 8,
                              "speed": 3
                          },
                          "repulse": {
                              "distance": 200,
                              "duration": 0.4
                          },
                          "push": {
                              "particles_nb": 4
                          },
                          "remove": {
                              "particles_nb": 2
                          }
                      }
                  },
                  "retina_detect": true
              });
              break;
          
          case 'snow':
              particlesJS("particles", {
                  "particles": {
                      "number": {
                          "value": 60,
                          "density": {
                              "enable": true,
                              "value_area": 800
                          }
                      },
                      "color": {
                          "value": "#fff"
                      },
                      "shape": {
                          "type": "circle",
                          "stroke": {
                              "width": 0,
                              "color": "#000000"
                          },
                          "polygon": {
                              "nb_sides": 5
                          }
                      },
                      "opacity": {
                          "value": 0.5,
                          "random": true,
                          "anim": {
                              "enable": false,
                              "speed": 1,
                              "opacity_min": 0.1,
                              "sync": false
                          }
                      },
                      "size": {
                          "value": 7,
                          "random": true,
                          "anim": {
                              "enable": false,
                              "speed": 40,
                              "size_min": 0.1,
                              "sync": false
                          }
                      },
                      "line_linked": {
                          "enable": false,
                          "distance": 500,
                          "color": "#ffffff",
                          "opacity": 0.4,
                          "width": 2
                      },
                      "move": {
                          "enable": true,
                          "speed": 3,
                          "direction": "bottom",
                          "random": false,
                          "straight": false,
                          "out_mode": "out",
                          "bounce": false,
                          "attract": {
                              "enable": false,
                              "rotateX": 600,
                              "rotateY": 1200
                          }
                      }
                  },
                  "interactivity": {
                      "detect_on": "canvas",
                      "events": {
                          "onhover": {
                              "enable": true,
                              "mode": "bubble"
                          },
                          "onclick": {
                              "enable": true,
                              "mode": "repulse"
                          },
                          "resize": true
                      },
                      "modes": {
                          "grab": {
                              "distance": 400,
                              "line_linked": {
                                  "opacity": 0.5
                              }
                          },
                          "bubble": {
                              "distance": 400,
                              "size": 4,
                              "duration": 0.3,
                              "opacity": 1,
                              "speed": 3
                          },
                          "repulse": {
                              "distance": 200,
                              "duration": 0.4
                          },
                          "push": {
                              "particles_nb": 4
                          },
                          "remove": {
                              "particles_nb": 2
                          }
                      }
                  },
                  "retina_detect": true
              });
              break;
          
          case 'dust':
              particlesJS("particles", {
                  "particles": {
                      "number": {
                          "value": 120,
                          "density": {
                              "enable": true,
                              "value_area": 800
                          }
                      },
                      "color": {
                          "value": "#ffffff"
                      },
                      "shape": {
                          "type": "circle",
                          "stroke": {
                              "width": 0,
                              "color": "#000000"
                          },
                          "polygon": {
                              "nb_sides": 5
                          }
                      },
                      "opacity": {
                          "value": 0.5,
                          "random": false,
                          "anim": {
                              "enable": true,
                              "speed": 1,
                              "opacity_min": 0.1,
                              "sync": false
                          }
                      },
                      "size": {
                          "value": 3,
                          "random": true,
                          "anim": {
                              "enable": true,
                              "speed": 0,
                              "size_min": 0.1,
                              "sync": false
                          }
                      },
                      "line_linked": {
                          "enable": false,
                          "distance": 0,
                          "color": "#ffffff",
                          "opacity": 0.24463576890600452,
                          "width": 1.2626362266116362
                      },
                      "move": {
                          "enable": true,
                          "speed": 3,
                          "direction": "none",
                          "random": false,
                          "straight": false,
                          "out_mode": "out",
                          "bounce": false,
                          "attract": {
                              "enable": false,
                              "rotateX": 600,
                              "rotateY": 1200
                          }
                      }
                  },
                  "interactivity": {
                      "detect_on": "canvas",
                      "events": {
                          "onhover": {
                              "enable": false,
                              "mode": "grab"
                          },
                          "onclick": {
                              "enable": true,
                              "mode": "push"
                          },
                          "resize": true
                      },
                      "modes": {
                          "grab": {
                              "distance": 400,
                              "line_linked": {
                                  "opacity": 1
                              }
                          },
                          "bubble": {
                              "distance": 400,
                              "size": 40,
                              "duration": 2,
                              "opacity": 8,
                              "speed": 3
                          },
                          "repulse": {
                              "distance": 200,
                              "duration": 0.4
                          },
                          "push": {
                              "particles_nb": 4
                          },
                          "remove": {
                              "particles_nb": 2
                          }
                      }
                  },
                  "retina_detect": true
              });
              break;
          
          case 'clean':
          default:
              // Không làm gì, đã xóa particles ở trên
              break;
      }
  });
});