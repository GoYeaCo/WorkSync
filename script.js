class WorkSync {
    constructor() {
        this.events = JSON.parse(localStorage.getItem('events')) || [];
        this.currentDate = new Date();
        this.initializeElements();
        this.attachEventListeners();
        this.renderCalendar();
        this.renderEventsList();
        this.initializeMonthJump();
    }

    initializeElements() {
        this.calendarGrid = document.getElementById('calendarGrid');
        this.currentMonthElement = document.getElementById('currentMonth');
        this.eventForm = document.getElementById('event-form');
        this.newEventForm = document.getElementById('newEventForm');
        this.eventsList = document.getElementById('eventsList');
    }

    attachEventListeners() {
        document.getElementById('addEventBtn').addEventListener('click', () => this.showEventForm());
        document.getElementById('cancelEvent').addEventListener('click', () => this.hideEventForm());
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        this.newEventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });
    }

    handleNavigation(e) {
        const view = e.target.dataset.view;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        if (view === 'calendar') {
            document.getElementById('calendar-view').style.display = 'block';
            document.getElementById('events-list').style.display = 'none';
        } else {
            document.getElementById('calendar-view').style.display = 'none';
            document.getElementById('events-list').style.display = 'block';
        }
    }

    showEventForm() {
        this.eventForm.style.display = 'flex';
        this.eventForm.querySelector('.modal-content').classList.add('animate__animated', 'animate__zoomIn');
    }

    hideEventForm() {
        this.eventForm.style.display = 'none';
        this.newEventForm.reset();
    }

    handleEventSubmit(e) {
        e.preventDefault();
        
        const eventData = {
            id: this.currentEditingId || Date.now(),
            title: document.getElementById('eventTitle').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            description: document.getElementById('eventDescription').value,
            files: Array.from(document.getElementById('eventFiles').files).map(file => file.name)
        };

        if (this.currentEditingId) {
            const index = this.events.findIndex(e => e.id === this.currentEditingId);
            this.events[index] = eventData;
            this.currentEditingId = null;
        } else {
            this.events.push(eventData);
        }

        this.saveEvents();
        this.hideEventForm();
        this.renderCalendar();
        this.renderEventsList();
    }

    saveEvents() {
        localStorage.setItem('events', JSON.stringify(this.events));
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        this.currentMonthElement.textContent = new Date(year, month)
            .toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        this.calendarGrid.innerHTML = '';

        // Add day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day header';
            dayHeader.textContent = day;
            this.calendarGrid.appendChild(dayHeader);
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            this.calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const dateObj = new Date(year, month, day);
            const today = new Date();
            
            if (dateObj.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayEvents = this.events.filter(event => event.date === dateStr);
            
            dayElement.innerHTML = `
                <div class="day-number">${day}</div>
                <div class="day-events">
                    ${dayEvents.map(event => `
                        <div class="event-tag">${event.title}</div>
                    `).join('')}
                </div>
            `;

            if (dayEvents.length) {
                dayElement.classList.add('has-event');
            }

            dayElement.addEventListener('click', () => this.showDayDetails(dateObj));
            this.calendarGrid.appendChild(dayElement);
        }
    }

    showDayDetails(date) {
        const dateStr = date.toISOString().split('T')[0];
        const dayEvents = this.events.filter(event => event.date === dateStr);

        Promise.all(dayEvents.map(async event => {
            if (event.files && event.files.length) {
                const previews = await Promise.all(event.files.map(file => this.handleFilePreview(file)));
                event.filePreviewsHtml = previews.join('');
            }
            return event;
        })).then(updatedDayEvents => {
            const overlay = document.createElement('div');
            overlay.className = 'day-detail-overlay animate__animated animate__fadeIn';

            const modal = document.createElement('div');
            modal.className = 'day-detail-modal animate__animated animate__zoomIn';

            modal.innerHTML = `
                <h3>${date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <div class="day-events-list">
                    ${updatedDayEvents.map(event => `
                        <div class="event-card">
                            <h4>${event.title}</h4>
                            <p>Time: ${event.time}</p>
                            <p>${event.description}</p>
                            ${event.files && event.files.length ? `<p>Files: ${event.files.join(', ')}</p>` : ''}
                            ${event.filePreviewsHtml ? `
                                <div class="file-previews">
                                    ${event.filePreviewsHtml}
                                </div>
                            ` : ''}
                            <div class="event-actions">
                                <button class="btn-edit" data-event-id="${event.id}">Edit</button>
                                <button class="btn-delete" data-event-id="${event.id}">Delete</button>
                            </div>
                        </div>
                    `).join('') || '<p>No events for this day</p>'}
                </div>
                <button class="btn-secondary" onclick="this.closest('.day-detail-overlay').remove()">Close</button>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);


            // Attach event listeners *after* the modal content is added to the DOM
            modal.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', (e) => {
                    const eventId = parseInt(e.target.dataset.eventId, 10);
                    this.deleteEvent(eventId);
                });
            });
            modal.querySelectorAll('.btn-edit').forEach(button => {
                button.addEventListener('click', (e) => {
                    const eventId = parseInt(e.target.dataset.eventId, 10);
                    const eventToEdit = this.events.find(ev => ev.id === eventId);
                    this.editEvent(eventToEdit);
                });
            });
        });
    }
    renderEventsList() {
        this.eventsList.innerHTML = '';
        
        const sortedEvents = [...this.events].sort((a, b) => 
            new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)
        );

        sortedEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card animate__animated animate__fadeIn';
            eventCard.innerHTML = `
                <h3>${event.title}</h3>
                <p>Date: ${new Date(event.date).toLocaleDateString()}</p>
                <p>Time: ${event.time}</p>
                <p>${event.description}</p>
                ${event.files.length ? `<p>Attachments: ${event.files.join(', ')}</p>` : ''}
                <div class="event-actions">
                    <button class="btn-edit" onclick="workSync.editEvent(${JSON.stringify(event)})">Edit</button>
                    <button class="btn-delete" onclick="workSync.deleteEvent(${event.id})">Delete</button>
                </div>
            `;
            this.eventsList.appendChild(eventCard);
        });
    }

    deleteEvent(eventId) {
        const confirmDelete = document.createElement('div');
        confirmDelete.className = 'confirm-delete animate__animated animate__fadeIn';
        confirmDelete.innerHTML = `
            <div class="confirm-content">
                <p>Delete this event?</p>
                <div class="confirm-actions">
                    <button class="btn-delete" onclick="workSync.confirmDelete(${eventId}, this)">Delete</button>
                    <button class="btn-secondary" onclick="this.closest('.confirm-delete').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmDelete);
    }

    confirmDelete(eventId, element) {
        this.events = this.events.filter(event => event.id !== eventId);
        this.saveEvents();
        this.renderCalendar();
        this.renderEventsList();
        // Correct the element being removed here:
        element.closest('.confirm-delete').remove(); 
        if (document.querySelector('.day-detail-overlay')) {
            document.querySelector('.day-detail-overlay').remove();
        }
    }

    editEvent(event) {
        const editModal = document.createElement('div');
        editModal.className = 'edit-modal animate__animated animate__fadeIn';
        editModal.innerHTML = `
            <div class="edit-content">
                <h3>Edit Event</h3>
                <form id="quickEditForm">
                    <div class="form-group">
                        <input type="text" value="${event.title}" id="quickTitle" required>
                    </div>
                    <div class="form-group">
                        <input type="date" value="${event.date}" id="quickDate" required>
                    </div>
                    <div class="form-group">
                        <input type="time" value="${event.time}" id="quickTime" required>
                    </div>
                    <div class="form-group">
                        <textarea id="quickDescription">${event.description}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Save</button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.edit-modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(editModal);

        document.getElementById('quickEditForm').onsubmit = (e) => {
            e.preventDefault();
            const updatedEvent = {
                ...event,
                title: document.getElementById('quickTitle').value,
                date: document.getElementById('quickDate').value,
                time: document.getElementById('quickTime').value,
                description: document.getElementById('quickDescription').value
            };

            const index = this.events.findIndex(e => e.id === event.id);
            this.events[index] = updatedEvent;
            this.saveEvents();
            this.renderCalendar();
            this.renderEventsList();
            editModal.remove();
            if (document.querySelector('.day-detail-overlay')) {
                document.querySelector('.day-detail-overlay').remove();
            }
        };
    }
    initializeMonthJump() {
        const monthInput = document.createElement('input');
        monthInput.type = 'month';
        monthInput.className = 'month-input';
        monthInput.valueAsDate = new Date();
        
        monthInput.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-');
            this.jumpToMonth(parseInt(year), parseInt(month) - 1);
        });
        
        document.querySelector('.calendar-header').appendChild(monthInput);
    }

    jumpToMonth(year, month) {
        const direction = month > this.currentDate.getMonth() ? 'left' : 'right';
        this.calendarGrid.classList.add(`slide-${direction}`);
        
        setTimeout(() => {
            this.currentDate.setFullYear(year, month);
            this.renderCalendar();
            this.calendarGrid.classList.remove(`slide-${direction}`);
        }, 500);
    }

    handleFilePreview(file) {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = `<img src="${e.target.result}" class="file-preview">`;
                    resolve(img);
                };
                reader.readAsDataURL(file);
            } else {
                resolve(`<div class="file-preview-icon">${file.name}</div>`);
            }
        });
    }

    printCalendar() {
        const printWindow = window.open('', '_blank');
        const styles = Array.from(document.styleSheets)
            .map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'))
            .join('\n');

        printWindow.document.write(`
            <html>
                <head>
                    <style>${styles}</style>
                </head>
                <body>
                    <div class="watermark">WorkSync Calendar</div>
                    ${this.calendarGrid.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

let workSync;
document.addEventListener('DOMContentLoaded', () => {
    workSync = new WorkSync();
});