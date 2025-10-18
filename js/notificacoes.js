// Em: petshop-site/js/notificacoes.js (ARQUIVO NOVO)

// Função para mostrar notificação de SUCESSO (verde)
export function mostrarSucesso(mensagem) {
    Toastify({
        text: mensagem,
        duration: 3000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        },
    }).showToast();
}

// Função para mostrar notificação de ERRO (vermelho)
export function mostrarErro(mensagem) {
    Toastify({
        text: mensagem,
        duration: 5000, // Erros ficam mais tempo na tela
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)",
        },
    }).showToast();
}