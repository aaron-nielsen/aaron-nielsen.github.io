---
layout: page
title: Travels
permalink: /travels/
---

I enjoy traveling, whether it be roadtripping in the USA or backpacking abroad. 

At present count I have visited <a href="/images/countries.png">24 countries</a> and <a href="/images/states.png">46 states</a>.

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">

<div class="travel-swiper swiper">
  <div class="swiper-wrapper">

    <div class="swiper-slide">{% include image.html url="/images/24-bamberg.jpg" caption="Bamberg, Germany (2024)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/23-nebaska.jpeg" caption="Lincoln, Nebraska (2023)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/22-mexico.jpg" caption="Cancun, Mexico (2022)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/21-austin.jpeg" caption="Austin, Texas (2021)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/hawaii.jpg" caption="Maui, Hawaii (2019)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/costarica.png" caption="Arenal Volcano, Costa Rica (2018)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/mexico.png" caption="Chichen Itza, Mexico (2018)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/17-wilmington.jpeg" caption="Wilmington, North Carolina (2017)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/16-wrigley.jpeg" caption="Wrigley Field, Chicago, Illinois (2016)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/curacao.jpg" caption="Willemstad, Curacao (2015)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/ferry.jpg" caption="Ferry to Fanø Island, Denmark (2012)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/iceland.jpg" caption="Waterfall near Reykjavík, Iceland (2012)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/oktoberfest.jpg" caption="Oktoberfest, Munich, Germany (2010)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/quebec.JPG" caption="Winter Carnival, Québec City (2010)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/09-hague.jpg" caption="The Hague, Netherlands (2009)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/greatwall.jpg" caption="The Great Wall near Beijing, China (2008)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/06-unitednations.JPG" caption="United Nations, New York (2006)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/prague.JPG" caption="Prague, Czech Republic (2005)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/05-stockholm.jpg" caption="Stockholm, Sweden (2005)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/germany.JPG" caption="Neuschwanstein Castle, Germany (2004)" %}</div>
    <div class="swiper-slide">{% include image.html url="/images/rome.JPG" caption="Colosseum, Rome, Italy (2004)" %}</div>

  </div>

  <div class="swiper-button-prev" aria-label="Previous photo"></div>
  <div class="swiper-button-next" aria-label="Next photo"></div>
  <div class="swiper-pagination"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    new Swiper(".travel-swiper", {
      loop: true,
      grabCursor: true,
      slidesPerView: 1,
      spaceBetween: 12,
      keyboard: { enabled: true },
      pagination: { el: ".travel-swiper .swiper-pagination", clickable: true },
      navigation: {
        nextEl: ".travel-swiper .swiper-button-next",
        prevEl: ".travel-swiper .swiper-button-prev"
      }
    });
  });
</script>
