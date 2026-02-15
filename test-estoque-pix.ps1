# ========================================
# 🧪 Script de Teste: Fluxo Completo de Estoque com PIX
# ========================================

param(
    [string]$ProductId = "1",
    [int]$Quantity = 3,
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "
╔════════════════════════════════════════════════════════════╗
║  🧪 TESTE COMPLETO: Estoque + PIX                         ║
║                                                            ║
║  Farmácia Victor: Diminuição Automática de Estoque        ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Cores para output
$ColorSuccess = "Green"
$ColorError = "Red"
$ColorInfo = "Cyan"
$ColorWarning = "Yellow"

# Função auxiliar
function Test-Api {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n📌 $Description" -ForegroundColor $ColorInfo
    Write-Host "   $Method $BaseUrl$Endpoint" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = "$BaseUrl$Endpoint"
            Method = $Method
            Headers = @{
                "Content-Type" = "application/json"
            }
        }
        
        if ($Body) {
            $params["Body"] = $Body | ConvertTo-Json -Depth 10
            Write-Host "   Body: $($Body | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        Write-Host "   ✅ Sucesso" -ForegroundColor $ColorSuccess
        return $response
    }
    catch {
        Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor $ColorError
        return $null
    }
}

# ============================================
# 1️⃣ VERIFICAR ESTOQUE INICIAL
# ============================================
Write-Host "`n
╔════════════════════════════════════════════════════════════╗
║  1️⃣  VERIFICANDO ESTOQUE INICIAL                           ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$productBefore = Test-Api -Method GET -Endpoint "/api/products/$ProductId" -Description "Buscar produto antes do pedido"

if ($productBefore) {
    Write-Host "
    📦 Produto: $($productBefore.name)
    💰 Preço: R$ $($productBefore.price)
    📊 Estoque ANTES: $($productBefore.stock) unidades
    " -ForegroundColor White
}

# ============================================
# 2️⃣ CRIAR PEDIDO COM PIX
# ============================================
Write-Host "
╔════════════════════════════════════════════════════════════╗
║  2️⃣  CRIANDO PEDIDO COM PIX                               ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$userId = [guid]::NewGuid().ToString()
$orderBody = @{
    userId = $userId
    items = @(
        @{
            productId = $ProductId
            quantity = $Quantity
        }
    )
    customerName = "Teste Cliente PIX"
    customerPhone = "11987654321"
    deliveryAddress = "Rua Teste, 123"
    paymentMethod = "pix"
}

$order = Test-Api -Method POST -Endpoint "/api/orders" -Body $orderBody -Description "Criar novo pedido"

if ($order) {
    $OrderId = $order.order.id
    Write-Host "
    🎯 ID do Pedido: $OrderId
    💳 Método: $($order.order.payment_method)
    📋 Status: $($order.order.status)
    💰 Total: R$ $($order.order.total)
    " -ForegroundColor White
} else {
    Write-Host "❌ Falha ao criar pedido. Encerrando teste." -ForegroundColor $ColorError
    exit 1
}

# ============================================
# 3️⃣ GERAR PIX QR CODE
# ============================================
Write-Host "
╔════════════════════════════════════════════════════════════╗
║  3️⃣  GERANDO PIX QR CODE                                  ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$pix = Test-Api -Method POST -Endpoint "/api/orders/$OrderId/generate-pix" -Description "Gerar QR Code PIX"

if ($pix) {
    Write-Host "
    🔑 Payment ID: $($pix.paymentId)
    ✅ Status: $($pix.status)
    💵 Valor: R$ $($pix.valor)
    " -ForegroundColor White
} else {
    Write-Host "❌ Falha ao gerar PIX. Encerrando teste." -ForegroundColor $ColorError
    exit 1
}

# ============================================
# 4️⃣ SIMULAR CONFIRMAÇÃO DE PAGAMENTO
# ============================================
Write-Host "
╔════════════════════════════════════════════════════════════╗
║  4️⃣  SIMULANDO CONFIRMAÇÃO DE PAGAMENTO PIX              ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$webhookBody = @{
    paymentId = $pix.paymentId
    status = "approved"
    orderId = $OrderId
}

$webhook = Test-Api -Method POST -Endpoint "/api/orders/webhook/payment" -Body $webhookBody -Description "Simular webhook de pagamento"

if ($webhook) {
    Write-Host "
    ✅ Webhook: $($webhook.message)
    📊 Payment Status: $($webhook.order.payment_status)
    " -ForegroundColor $ColorSuccess
}

# ============================================
# 5️⃣ VERIFICAR ESTOQUE FINAL
# ============================================
Write-Host "
╔════════════════════════════════════════════════════════════╗
║  5️⃣  VERIFICANDO ESTOQUE APÓS PAGAMENTO                  ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Start-Sleep -Milliseconds 500

$productAfter = Test-Api -Method GET -Endpoint "/api/products/$ProductId" -Description "Buscar produto após pagamento"

if ($productAfter) {
    Write-Host "
    📦 Produto: $($productAfter.name)
    💰 Preço: R$ $($productAfter.price)
    📊 Estoque ANTES: $($productBefore.stock) unidades
    📊 Estoque DEPOIS: $($productAfter.stock) unidades
    " -ForegroundColor White
    
    $diferenca = $productBefore.stock - $productAfter.stock
    
    if ($diferenca -eq $Quantity) {
        Write-Host "`n    🎉 ✅ SUCESSO! Estoque decrementou corretamente em $Quantity unidade(s)" -ForegroundColor $ColorSuccess
    } elseif ($diferenca -lt $Quantity) {
        Write-Host "`n    ⚠️  Estoque decrementou apenas $diferenca de $Quantity esperadas" -ForegroundColor $ColorWarning
    } else {
        Write-Host "`n    ❌ ERRO! Estoque decrementou mais que o esperado" -ForegroundColor $ColorError
    }
}

# ============================================
# 📊 RESUMO FINAL
# ============================================
Write-Host "
╔════════════════════════════════════════════════════════════╗
║  📊 RESUMO DO TESTE                                       ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$resumo = @"
┌─────────────────────────────────────────────────────────────┐
│ INFORMAÇÕES DO TESTE:                                       │
├─────────────────────────────────────────────────────────────┤
│ 📦 Produto ID: $ProductId
│ 🛒 Quantidade Comprada: $Quantity unidade(s)
│ 🎯 Pedido ID: $OrderId
│ 🔑 Payment ID: $($pix.paymentId)
│
│ 📊 ESTOQUE:
│   • Antes: $($productBefore.stock) unidades
│   • Depois: $($productAfter.stock) unidades
│   • Diferença: -$($productBefore.stock - $productAfter.stock) unit(s)
│
│ ✅ RESULTADO: 
"@

$resultado = if ($diferenca -eq $Quantity) { "APROVADO ✅" } else { "FALHOU ❌" }
$resumo += "│   $resultado
│
│ 💰 PEDIDO:
│   • Método: PIX
│   • Total: R$ $($order.order.total)
│   • Status: $($order.order.status)
│   • Payment Status: $($webhook.order.payment_status)
└─────────────────────────────────────────────────────────────┘
"@

Write-Host $resumo -ForegroundColor White

Write-Host "`n✨ Teste Finalizado!" -ForegroundColor $ColorSuccess
