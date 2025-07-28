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

function openModal() {
	const modal = document.getElementById('modal')
	modal.style.display = 'block'
	document.body.classList.add('body-no-scroll')
}

const form = document.getElementById('contacts__form')
const submitBtn = form.querySelector('button[type="submit"]')

function showPopup(message, type = 'success', duration = 3000) {
	const existing = document.querySelector('.custom-popup')
	if (existing) existing.remove()

	const popup = document.createElement('div')
	popup.className = `custom-popup ${type}`
	popup.textContent = message
	document.body.appendChild(popup)

	setTimeout(() => popup.classList.add('show'), 10)

	setTimeout(() => {
		popup.classList.remove('show')
		setTimeout(() => popup.remove(), 300)
	}, duration)
}

function canSendLead() {
	const storage = localStorage.getItem('lead_send_data')
	if (!storage) return true

	const data = JSON.parse(storage)
	const now = Date.now()

	if (data.count >= 3) {
		showPopup('Вы достигли максимума отправленных заявок (3).', 'error', 4000)
		return false
	}

	if (now - data.lastSent < 15 * 60 * 1000) {
		showPopup(
			'Следующая заявка может быть отправлена не раньше, чем через 15 минут.',
			'error',
			4000
		)
		return false
	}

	return true
}

function updateLeadSendData() {
	const storage = localStorage.getItem('lead_send_data')
	const now = Date.now()

	let data = { count: 0, lastSent: 0 }
	if (storage) {
		data = JSON.parse(storage)
	}
	data.count++
	data.lastSent = now

	localStorage.setItem('lead_send_data', JSON.stringify(data))
}

form.addEventListener('submit', async function (event) {
	event.preventDefault()

	if (!canSendLead()) return

	const name = document.getElementById('contacts__name').value.trim()
	const phone = document.getElementById('contacts__tel').value.trim()
	const description = document.getElementById('contacts__desc').value.trim()

	const phonePattern = /^\+7\s\(9\d{2}\)\s\d{3}-\d{2}-\d{2}$/
	if (!phonePattern.test(phone)) {
		showPopup(
			'Пожалуйста, введите телефон в формате +7 (9xx) xxx-xx-xx',
			'error'
		)
		return
	}

	if (name.length < 1) {
		showPopup('Введите ваше имя', 'error')
		return
	}
	if (description.length < 1) {
		showPopup('Опишите, что нужно сделать', 'error')
		return
	}

	const formattedPhone = phone.replace(/\D/g, '')
	const phoneForApi = '+7' + formattedPhone.slice(1)

	const data = {
		customer_name: name,
		customer_phone: phoneForApi,
		description: description,
	}

	submitBtn.disabled = true

	try {
		const response = await fetch('/path/to/send-lead.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		})

		const result = await response.json()

		if (response.ok && result.result === true) {
			showPopup(
				'Заявка успешно отправлена! Мы скоро свяжемся с вами.',
				'success',
				4000
			)
			this.reset()
			updateLeadSendData()
		} else {
			showPopup(
				'Ошибка при отправке заявки: ' +
					(result.message || JSON.stringify(result)),
				'error',
				5000
			)
		}
	} catch (error) {
		showPopup('Ошибка сети или сервера: ' + error.message, 'error', 5000)
	} finally {
		submitBtn.disabled = false
	}
})

async function sendTelegramMessage(message) {
	try {
		const response = await fetch('/path/to/sendMessage.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message }),
		})

		if (!response.ok) {
			const errorData = await response.json()
			console.error(
				'Ошибка при отправке сообщения:',
				errorData.error || response.statusText
			)
			return false
		}

		const result = await response.json()
		console.log('Сообщение отправлено:', result)
		return true
	} catch (error) {
		console.error('Ошибка сети:', error)
		return false
	}
}
