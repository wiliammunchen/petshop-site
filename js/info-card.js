import { LitElement, html, css } from 'https://esm.sh/lit@3';

export class InfoCard extends LitElement {
    static properties = {
        title: { type: String },
        value: { type: String },
        icon: { type: String },
    };

    // Styles (ajustes de espaçamento e tamanhos conforme solicitado)
    static styles = css`
        :host {
            display: block;
        }
        .info-card {
            background-color: #ffffff;
            border-radius: 15px;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border-left: 5px solid #4f46e5;
        }
        .card-icon {
            font-size: 1.5rem;
            color: #4f46e5;
            background-color: #eef2ff;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .card-content h3 {
            font-size: 0.9rem;
            color: #64748b;
            margin: 0 0 0.25rem 0;
            font-family: 'Poppins', sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 240px;
        }
        .card-content p {
            font-size: 1.5rem;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
            font-family: 'Poppins', sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 260px;
        }
    `;

    constructor() {
        super();
        this.title = '';
        this.value = '';
        this.icon = 'fas fa-info-circle';
    }

    render() {
        // garante que value seja string e escape automático pelo lit
        const displayValue = (this.value == null) ? '' : String(this.value);
        return html`
            <div class="info-card" role="group" aria-label="${this.title}">
                <div class="card-icon" aria-hidden="true"><i class="${this.icon}"></i></div>
                <div class="card-content">
                    <h3 title="${this.title}">${this.title}</h3>
                    <p title="${displayValue}">${displayValue}</p>
                </div>
            </div>
        `;
    }
}

customElements.define('info-card', InfoCard);