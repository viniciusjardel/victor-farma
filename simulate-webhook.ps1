# Script para simular webhook de pagamento PIX aprovado
# Use o orderId da sua tentativa anterior

param(
    [String]$OrderId = $(Read-Host "Cole o OrderId (copie do console Browser após gerar PIX)")
)

$ApiUrl = "https://victor-farma.onrender.com/api"

Write-Host "🔄 Simulando aprovação de pagamento para ordem: $OrderId" -ForegroundColor Cyan

$payload = @{
    paymentId = "TEST_$(Get-Random -Minimum 100000000000 -Maximum 999999999999)"
    status = "approved"
    orderId = $OrderId
} | ConvertTo-Json

Write-Host "📤 Enviando payload:" -ForegroundColor Yellow
Write-Host $payload

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/orders/webhook/payment" `
        -Method POST `
        -Body $payload `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Webhook enviado com sucesso!" -ForegroundColor Green
    Write-Host "📊 Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📋 Resposta:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
    
    # Verificar status do pedido
    Write-Host "`n🔍 Verificando status atualizado de $OrderId..." -ForegroundColor Cyan
    
    $checkResponse = Invoke-WebRequest -Uri "$ApiUrl/orders/$OrderId" `
        -Method GET `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Status obtido:" -ForegroundColor Green
    $orderData = $checkResponse.Content | ConvertFrom-Json
    Write-Host "Status: $($orderData.order.status)" -ForegroundColor Green
    Write-Host "Payment Status: $($orderData.order.payment_status)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erro ao enviar webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n💡 Abra o navegador (F12 > Console) e veja se a mensagem muda para '✅ Pagamento confirmado!'" -ForegroundColor Yellow
