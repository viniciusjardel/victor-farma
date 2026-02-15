# Script para simular webhook de pagamento PIX aprovado
# Use o orderId da sua tentativa anterior

param(
    [String]$OrderId = $(Read-Host "Cole o OrderId (copie do console Browser após gerar PIX)")
)

$ApiUrl = "https://victor-farma.onrender.com/api"

Write-Host "🔄 Simulando aprovação de pagamento para ordem: $OrderId" -ForegroundColor Cyan

try {
    Write-Host "📤 Enviando para endpoint de teste..." -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "$ApiUrl/orders/test-webhook/$OrderId" `
        -Method POST `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Webhook simulado com sucesso!" -ForegroundColor Green
    Write-Host "📊 Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📋 Resposta:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
    
    # Verificar status do pedido
    Write-Host "`n🔍 Verificando status atualizado..." -ForegroundColor Cyan
    
    $checkResponse = Invoke-WebRequest -Uri "$ApiUrl/orders/$OrderId" `
        -Method GET `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Status obtido:" -ForegroundColor Green
    $orderData = $checkResponse.Content | ConvertFrom-Json
    Write-Host "Status: $($orderData.order.status)" -ForegroundColor Green
    Write-Host "Payment Status: $($orderData.order.payment_status)" -ForegroundColor Green
    
    if ($orderData.order.status -eq "confirmed") {
        Write-Host "`n✅ SUCESSO! O Backend está funcionando corretamente!" -ForegroundColor Green
        Write-Host "Agora o Frontend deve mostrar '✅ Pagamento confirmado!' no modal" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Erro ao enviar webhook simulado:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n💡 Verifique o navegador (F12 > Console) após executar este script." -ForegroundColor Yellow
Write-Host "   Você deve ver logs como: '✅ Pagamento confirmado via polling!'" -ForegroundColor Yellow

