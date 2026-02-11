// ==================== GERADOR PIX MOCK ====================
// Função auxiliar para gerar PIX Mock (para testes)
function generatePixMock(amount, orderId) {
  // Gerar um ID fictício de pagamento
  const paymentId = 'mock_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
  
  // Gerar um QR Code mock (representação visual, não real)
  const mockQRCode = `00020126580014br.gov.bcb.pix0136${orderId}-mock-pix-test1234567890520400005303986540510.${amount}5802BR5913Victor Farma6009Sao Paulo62410503***63041D3D`;
  
  return {
    data: {
      id: paymentId,
      status: 'pending',
      qr_code: mockQRCode,
      qr_code_base64: Buffer.from(mockQRCode).toString('base64'),
      valor: amount,
      descricao: `Pedido #${orderId.slice(0, 8)}`
    }
  };
}

module.exports = generatePixMock;
