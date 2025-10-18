import { corsHeaders } from '../_shared/cors.ts'

// A mesma função de validação que você já tem no frontend
function validarCPF(cpf: string): boolean {
  cpf = String(cpf).replace(/[^\d]+/g, '');
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  let add = 0;
  for (let i = 0; i < 9; i++) {
    add += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) {
    rev = 0;
  }
  if (rev !== parseInt(cpf.charAt(9))) {
    return false;
  }
  add = 0;
  for (let i = 0; i < 10; i++) {
    add += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) {
    rev = 0;
  }
  if (rev !== parseInt(cpf.charAt(10))) {
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  // Lida com a requisição preflight OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cpf } = await req.json()

    if (!cpf) {
      throw new Error("O CPF é obrigatório.")
    }

    const isValid = validarCPF(cpf);

    if (!isValid) {
      // Retorna que não é válido, mas com status 200 OK para o cliente tratar
      return new Response(JSON.stringify({ isValid: false, message: 'CPF inválido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Se chegou até aqui, o CPF é válido
    return new Response(JSON.stringify({ isValid: true, message: 'CPF válido.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})