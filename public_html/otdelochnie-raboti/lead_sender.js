const counterId = 103509855

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

async function handleFormSubmit(form, nameId, phoneId, descId, submitBtn) {
	if (!canSendLead()) return

	const name = form.querySelector(`#${nameId}`).value.trim()
	const phone = form.querySelector(`#${phoneId}`).value.trim()
	const description = form.querySelector(`#${descId}`).value.trim()

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
	const utmParams = getCustomUtmParams()
	const dateTime = getVladivostokDateTime()
	const ClientID = getYandexClientID(counterId)

	const data = {
		customer_name: name,
		customer_phone: phoneForApi,
		description: `✉️ Заявка с сайта МНЧ Компания Отделочные работы\n🗒 Описание от клиента:\n${description}\n🔎 Запрос: ${utmParams.utm_term}\n⭐️ Группа: ${utmParams.utm_group}\n📅 Дата и время: ${dateTime}\nClientID: ${ClientID}`,
		city_id: utmParams.utm_city_id,
		source_id: 375,
	}

	submitBtn.disabled = true

	try {
		const response = await fetch('/api/send_mnc_lead.php', {
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
			ym(103509855, 'reachGoal', 'otdelka_lead')
			sendTelegramMessage(data.description)
			form.reset()
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
}

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

const contactsForm = document.getElementById('contacts__form')
if (contactsForm) {
	const contactsSubmit = contactsForm.querySelector('button[type="submit"]')
	contactsForm.addEventListener('submit', function (e) {
		e.preventDefault()
		handleFormSubmit(
			contactsForm,
			'contacts__name',
			'contacts__tel',
			'contacts__desc',
			contactsSubmit
		)
	})
}

const modalForm = document.getElementById('modal_form')
if (modalForm) {
	const modalSubmit = modalForm.querySelector('button[type="submit"]')
	modalForm.addEventListener('submit', function (e) {
		e.preventDefault()
		handleFormSubmit(
			modalForm,
			'modal_name',
			'modal_tel',
			'modal_desc',
			modalSubmit
		)
	})
}

async function sendTelegramMessage(message) {
	try {
		const response = await fetch('/api/sendMessageGroup.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message }),
		})

		const text = await response.text()

		let data
		try {
			data = JSON.parse(text)
		} catch {
			data = null
		}

		if (!response.ok) {
			console.error(
				'Ошибка при отправке сообщения:',
				(data && data.error) || response.statusText || text
			)
			return false
		}

		console.log('Сообщение отправлено:', data)
		return true
	} catch (error) {
		console.error('Ошибка сети:', error)
		return false
	}
}

function getCustomUtmParams() {
	const storageKey = 'custom_utm_params'

	let stored = localStorage.getItem(storageKey)
	if (stored) {
		try {
			const parsed = JSON.parse(stored)
			if (
				typeof parsed.utm_group === 'string' &&
				typeof parsed.utm_term === 'string' &&
				typeof parsed.utm_city_id === 'string'
			) {
				return parsed
			}
		} catch {}
	}

	const urlParams = new URLSearchParams(window.location.search)

	const utm_group = urlParams.get('utm_group') || ''
	let utm_term = urlParams.get('utm_term') || ''
	const utm_city_id = urlParams.get('utm_city_id') || ''

	try {
		utm_term = decodeURIComponent(utm_term)
	} catch {}

	const result = {
		utm_group,
		utm_term,
		utm_city_id,
	}

	localStorage.setItem(storageKey, JSON.stringify(result))

	return result
}

function getVladivostokDateTime() {
	const options = {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone: 'Asia/Vladivostok',
	}

	const formatter = new Intl.DateTimeFormat('ru-RU', options)
	const parts = formatter.formatToParts(new Date())

	const map = {}
	for (const part of parts) {
		map[part.type] = part.value
	}

	return `${map.day}.${map.month}.${map.year} ${map.hour}:${map.minute}:${map.second}`
}

function clickPhone() {
	const ClientID = getYandexClientID(counterId)
	const storageKey = `call_clicked_${ClientID}`
	const now = Date.now()

	const lastSent = parseInt(localStorage.getItem(storageKey), 10)
	if (!isNaN(lastSent) && now - lastSent < 60 * 60 * 1000) {
		console.log('Уже отправлено недавно, ждём 1 час')
		return
	}

	const dateTime = getVladivostokDateTime()
	const utmParams = getCustomUtmParams()
	const message = `📞 Позвонили МНЧ Компания Отделочные работы\n⭐️ Группа: ${utmParams.utm_group}\n🔍 Запрос: ${utmParams.utm_term}\n📅 Дата и время: ${dateTime}\nClientID: ${ClientID}`

	ym(103509855, 'reachGoal', 'otdelka_call')
	sendTelegramMessage(message)

	localStorage.setItem(storageKey, now.toString())
}

function getYandexClientID(counterId) {
	function getFromCookie() {
		const cookies = document.cookie.split(';')
		for (let cookie of cookies) {
			cookie = cookie.trim()
			if (cookie.startsWith('_ym_uid=')) {
				return cookie.substring('_ym_uid='.length)
			}
		}
		return null
	}
	function getFromAPI() {
		try {
			if (window.Ya && window.Ya.Metrika2 && window.Ya.Metrika2[counterId]) {
				return window.Ya.Metrika2[counterId].getClientID()
			}
			if (window.Ya && window.Ya.Metrika && window.Ya.Metrika[counterId]) {
				return window.Ya.Metrika[counterId].getClientID()
			}
		} catch (e) {}
		return null
	}

	function getFromYandexUidCookie() {
		const cookies = document.cookie.split(';')
		for (let cookie of cookies) {
			cookie = cookie.trim()
			if (cookie.startsWith('yandexuid=')) {
				return cookie.substring('yandexuid='.length)
			}
		}
		return null
	}

	let clientID = getFromAPI()
	if (clientID) return clientID

	clientID = getFromCookie()
	if (clientID) return clientID

	clientID = getFromYandexUidCookie()
	if (clientID) return clientID

	return null
}
