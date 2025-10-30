// Em: petshop-site/js/info-card.js

import { LitElement, html, css } from 'https://esm.sh/lit@3';

export class InfoCard extends LitElement {
    static properties = {
        title: { type: String },
        value: { type: String },
        icon: { type: String },
    };

    // As alterações de estilo estão aqui
    static styles = css`
        :host {
            display: block;
        }
        .info-card {
            background-color: #ffffff;
            border-radius: 15px;
            padding: 1rem; /* ANTES: 1.5rem */
            display: flex;
            align-items: center;
            gap: 1rem; /* ANTES: 1.5rem */
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border-left: 5px solid #4f46e5;
        }
        .card-icon {
            font-size: 1.5rem; /* ANTES: 2rem */
            color: #4f46e5;
            background-color: #eef2ff;
            width: 50px; /* ANTES: 60px */
            height: 50px; /* ANTES: 60px */
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .card-content h3 {
            font-size: 0.9rem; /* ANTES: 1rem */
            color: #64748b;
            margin: 0 0 0.25rem 0;
            font-family: 'Poppins', sans-serif;
            white-space: nowrap; /* Impede que o título quebre a linha */
        }
        .card-content p {
            font-size: 1.5rem; /* ANTES: 1.8rem */
            font-weight: bold;
            color: #1e293b;
            margin: 0;
            font-family: 'Poppins', sans-serif;
        }
    `;

    render() {
        return html`
            <div class="info-card">
                <div class="card-icon"><i class="${this.icon}"></i></div>
                <div class="card-content">
                    <h3>${this.title}</h3>
                    <p>${this.value}</p>
                </div>
            </div>
        `;
    }
}

customElements.define('info-card', InfoCard);