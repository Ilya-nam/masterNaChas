document.addEventListener('DOMContentLoaded', () => {
	const links = document.querySelectorAll('.header_nav__link')
	const blocks = document.querySelectorAll('.alterable_block')
	const header = document.querySelector('.header')

	if (!header) {
		console.error('Элемент .header не найден')
		return
	}

	window.addEventListener('scroll', () => {
		const headerHeight = header.offsetHeight
		let isOverAlterable = false

		blocks.forEach(block => {
			const rect = block.getBoundingClientRect()
			if (rect.top <= headerHeight && rect.bottom >= headerHeight) {
				isOverAlterable = true
			}
		})

		links.forEach(link => {
			if (isOverAlterable) {
				link.classList.add('dark-text')
			} else {
				link.classList.remove('dark-text')
			}
		})
		const scrollY = window.scrollY
		const maxLift = 1000

		const lift = Math.min(scrollY / 5, maxLift)

		const leftY = 0 - lift * 1
		const rightY = 0 - lift * 1

		const controlY = 100 - lift * 0.1

		const newD = `M0,${leftY} Q720,${controlY} 1440,${rightY} L1440,100 L0,100 Z`
		const parabolaPath = document.querySelector('.hero-parabola path')
		if (parabolaPath) {
			parabolaPath.setAttribute('d', newD)
		}
	})

	const observer = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible')
				}
			})
		},
		{
			threshold: 0.1,
		}
	)

	document.querySelectorAll('.scroll-fade').forEach(el => {
		observer.observe(el)
	})

	setTimeout(openModal, 40000)

	const phoneInputs = document.querySelectorAll('.input_tel')

	phoneInputs.forEach(input => {
		IMask(input, {
			mask: '+7 (000) 000-00-00',
		})
	})

	const consent = localStorage.getItem('cookieConsent')
	const consentBanner = document.getElementById('cookieConsent')
	const acceptBtn = document.getElementById('acceptBtn')

	if (!consent) {
		consentBanner.style.display = 'flex'
	} else {
		consentBanner.style.display = 'none'
	}

	acceptBtn.addEventListener('click', function () {
		localStorage.setItem('cookieConsent', 'accepted')
		consentBanner.style.display = 'none'
	})

	let cityId = getCityId()
	if (cityId) applyCity(cityId)
})

const reviews = document.querySelectorAll('.review')
const nextBtn = document.querySelector('.carousel-btn.next')
const prevBtn = document.querySelector('.carousel-btn.prev')
let current = 0

function showReview(index) {
	reviews.forEach((review, i) => {
		review.classList.toggle('active', i === index)
	})
}

function nextReview() {
	current = (current + 1) % reviews.length
	showReview(current)
}

function prevReview() {
	current = (current - 1 + reviews.length) % reviews.length
	showReview(current)
}

nextBtn.addEventListener('click', nextReview)
prevBtn.addEventListener('click', prevReview)

setInterval(nextReview, 7000)

function closeModal() {
	const modal = document.getElementById('modal')
	modal.style.display = 'none'
	document.body.classList.remove('body-no-scroll')
}

function openModal(desc = '') {
	const modal = document.getElementById('modal')
	const textarea = document.getElementById('modal_desc')
	if (desc) {
		textarea.value = desc
	}
	modal.style.display = 'block'
	document.body.classList.add('body-no-scroll')
}

const cityDataTag = document.getElementById('city-data')
const cities = cityDataTag ? JSON.parse(cityDataTag.textContent) : {}

function getCityId() {
	const params = new URLSearchParams(window.location.search)
	let id = null

	if (params.has('utm_city_id')) {
		id = params.get('utm_city_id')
		localStorage.setItem('utm_city_id', id)
	} else if (localStorage.getItem('utm_city_id')) {
		id = localStorage.getItem('utm_city_id')

		// подставляем в URL без перезагрузки
		let url = new URL(window.location.href)
		url.searchParams.set('utm_city_id', id)
		window.history.replaceState(null, '', url)
	}

	return id
}

function applyCity(id) {
	if (cities[id]) {
		const city = cities[id]
		let el1 = document.getElementById('hero_first_h1')
		let el2 = document.getElementById('advantage__p')
		let el3 = document.getElementById('contacts__link__city')

		if (el1 && !el1.dataset.cityApplied) {
			el1.textContent += ' ' + city.local
			el1.dataset.cityApplied = 'true' // чтобы не дублировалось
		}
		if (el2) el2.textContent = city.area
		if (el3) el3.textContent = city.area2
	}
}
