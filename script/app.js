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
