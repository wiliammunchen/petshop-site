import { supabase } from './supabase-config.js';

export async function gerarImpressaoAgendamento(agendamentoId) {
    // Query corrigida para buscar a forma de pagamento
    const { data: ag, error } = await supabase
        .from('agendamentos')
        .select(`
            *, 
            tipo_entrega, 
            clientes (*), 
            formas_pagamento (nome),
            agendamento_detalhes (*, pets (*), servicos (id, nome, valor, tipo_servico))
        `)
        .eq('id', agendamentoId)
        .single();

    if (error || !ag) {
        alert('Não foi possível carregar os dados para impressão.');
        console.error(error);
        return;
    }

    const dataHora = new Date(ag.data_hora_inicio);

    // Agrupa os serviços por pet
    const petsComServicos = {};
    ag.agendamento_detalhes.forEach(detalhe => {
        if (!petsComServicos[detalhe.pet_id]) {
            petsComServicos[detalhe.pet_id] = {
                nome: detalhe.pets.nome,
                raca: detalhe.pets.raca,
                servicos: []
            };
        }
        petsComServicos[detalhe.pet_id].servicos.push(detalhe.servicos);
    });

    const petsHtml = Object.values(petsComServicos).map(pet => `
        <div class="card-os pet-card-os">
            <div class="card-header">
                <h3><i class="fas fa-paw"></i> ${pet.nome} (${pet.raca || 'SRD'})</h3>
            </div>
            <div class="card-body">
                <table class="servicos-table">
                    <thead>
                        <tr>
                            <th>Serviço Realizado</th>
                            <th class="valor">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pet.servicos.map(s => `
                            <tr>
                                <td>${s.nome}</td>
                                <td class="valor">R$ ${s.valor ? s.valor.toFixed(2).replace('.', ',') : '0,00'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');

    const conteudoImpressao = `
        <html>
        <head>
            <title>Ordem de Serviço #${String(ag.id).padStart(5, '0')}</title>
            <link rel="stylesheet" href="css/impressao.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
        </head>
        <body class="print-body">
            <div class="ordem-servico">
                <div class="os-header">
                    <img src="images/logo-petshop.png" alt="Logo PetShop">
                    <div class="os-title">
                        <h1>Ordem de Serviço</h1>
                        <span>#${String(ag.id).padStart(5, '0')}</span>
                    </div>
                </div>

                <div class="os-details-bar">
                    <div><i class="fas fa-calendar-alt"></i> <strong>Data:</strong> ${dataHora.toLocaleDateString('pt-BR')}</div>
                    <div><i class="fas fa-clock"></i> <strong>Hora:</strong> ${dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                    <div><i class="fas fa-credit-card"></i> <strong>Pagamento:</strong> ${ag.formas_pagamento?.nome || 'Não definido'}</div>
                    <div><i class="fas fa-truck"></i> <strong>Transporte:</strong> ${ag.tipo_entrega || 'Cliente Traz'}</div>
                    <div><i class="fas fa-info-circle"></i> <strong>Status:</strong> ${ag.status}</div>
                </div>

                <div class="os-grid">
                    <div class="os-col">
                        <div class="card-os">
                            <div class="card-header">
                                <h3><i class="fas fa-user"></i> Dados do Cliente</h3>
                            </div>
                            <div class="card-body">
                                <p><strong>Nome:</strong> ${ag.clientes.nome}</p>
                                <p><strong>Telefone:</strong> ${ag.clientes.telefone || 'Não informado'}</p>
                                <p><strong>Endereço:</strong> ${ag.clientes.endereco || 'Não informado'}, ${ag.clientes.bairro || ''}</p>
                            </div>
                        </div>
                        <div class="card-os">
                            <div class="card-header">
                                <h3><i class="fas fa-comment"></i> Observações Gerais</h3>
                            </div>
                            <div class="card-body">
                                <p>${ag.observacoes || 'Nenhuma observação.'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="os-col">
                        ${petsHtml}
                    </div>
                </div>

                <div class="os-footer">
                    <div class="os-total">
                        <span>Valor Total</span>
                        <strong>R$ ${ag.valor_cobrado ? ag.valor_cobrado.toFixed(2).replace('.', ',') : '0,00'}</strong>
                    </div>
                    <div class="os-signature">
                        <div class="signature-line"></div>
                        <p>${ag.clientes.nome}</p>
                        <span>Assinatura do Responsável</span>
                    </div>
                </div>

                 <div class="print-footer">
                    Espaço PetShop - O cuidado que seu melhor amigo merece.
                </div>
            </div>
             <div class="print-note no-print">
                <p>Use o atalho Ctrl+P (ou Cmd+P no Mac) para imprimir.</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(conteudoImpressao);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
}