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
	})
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

setInterval(nextReview, 7000) // автоматическая прокрутка каждые 7 секунд
