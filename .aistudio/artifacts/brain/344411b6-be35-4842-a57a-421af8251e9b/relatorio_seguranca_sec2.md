# Relatório Técnico de Auditoria de Segurança - Fase 2 (SEC2)
**Projeto:** FinControl - Gestão Financeira Pessoal  
**Escopo:** Auditoria Avançada de Lógica de Negócios, Integridade Transacional, Cabeçalhos de Segurança e Armazenamento  
**Classificação:** Confidencial / Técnico  
**Status:** Concluído  

---

## 1. Sumário Executivo

A auditoria de segurança **Fase 2 (SEC2)** concentrou-se na análise dinâmica e estrutural de camadas críticas do **FinControl**, avaliando a resistência do sistema a manipulações financeiras, condições de corrida (*race conditions*), adulteração de estado local e integridade de transações bancárias.

Foram identificadas **5 vulnerabilidades específicas da Fase 2**, categorizadas de acordo com o padrão **OWASP Top 10** e calculadas com base no **CVSS v3.1**.

| ID | Vulnerabilidade | Severidade | CVSS v3.1 | Categoria OWASP |
|---|---|---|---|---|
| **SEC2-01** | Transações Financeiras Não-Atômicas e Risco de Race Condition | **Alta** | 7.5 | A04:2021 - Insecure Design |
| **SEC2-02** | Ausência de Validação de Esquema e Tipagem nas Regras do Firestore | **Média** | 6.5 | A05:2021 - Security Misconfiguration |
| **SEC2-03** | Adulteração de Estado Local e Ausência de Checksum no Modo Convidado | **Média** | 5.3 | A08:2021 - Software & Data Integrity Failures |
| **SEC2-04** | Falta de Cabeçalhos de Defesa (CSP, X-Frame-Options, Referrer-Policy) | **Média** | 5.0 | A05:2021 - Security Misconfiguration |
| **SEC2-05** | Fragilidade de Sanitização na Renderização e Rasterização de Relatórios | **Baixa** | 3.8 | A03:2021 - Injection |

---

## 2. Detalhamento Técnico das Vulnerabilidades

### 🔴 SEC2-01: Transações Financeiras Não-Atômicas (Race Conditions em Pagamentos)
- **Localização:** `src/App.tsx` e `src/components/BillsView.tsx` (`handlePayBill`, `handleDeleteBill`)
- **Vetor de Exploração:** O ato de liquidar uma conta a pagar executa duas operações independentes:
  1. Criação do registro de despesa em `transactions`.
  2. Atualização do saldo da conta bancária (`accounts`) debitando o valor.
  3. Atualização do status da fatura (`payable_bills`).
  Como essas chamadas não utilizam `runTransaction` do Firebase Firestore, qualquer interrupção de rede, timeout ou clique duplo no botão de pagar resulta em saldo inconsistente (ex: conta debitada sem registrar a transação, ou fatura baixada sem dedução do saldo da carteira PicPay).
- **Remediação:** Implementar transações atômicas com `runTransaction(db, async (transaction) => { ... })` no Firestore, garantindo que o débito na carteira e a criação da despesa sejam atômicos (tudo ou nada).

---

### 🟠 SEC2-02: Regras do Firestore sem Validação Estrita de Esquema (Data Schema Integrity)
- **Localização:** `firestore.rules`
- **Vetor de Exploração:** As regras atuais validam apenas `resource.data.userId == request.auth.uid`. Não há validação sobre os tipos e limites dos dados gravados. Um cliente autenticado malicioso pode enviar:
  - Valores negativos arbitrários (`amount: -99999999`) para fraudar balanços.
  - Sobrescrita de `userId` durante um `update`.
  - Injeção de propriedades não mapeadas ou payloads de grande volume (potencial DoS de cota de armazenamento).
- **Remediação:** Endurecer o `firestore.rules` com funções de validação de atributos obrigatórios (`amount is number`, `amount >= 0`, `userId` imutável no update).

---

### 🟠 SEC2-03: Adulteração de Estado Local e Ausência de Checksum no Armazenamento Local
- **Localização:** `src/App.tsx` (`localStorage.setItem`)
- **Vetor de Exploração:** Usuários operando em modo offline ou convidado têm seus dados gravados em texto plano no `localStorage`. Não há verificação de integridade (HMAC ou checksum). Se o usuário importar ou sofrer alteração via scripts ou extensões de navegador maliciosas, o parser pode quebrar a aplicação (`JSON.parse` desprotegido) ou forjar transações inexistentes.
- **Remediação:** Adicionar encapsulamento com try/catch defensivo, sanitização do schema na desserialização do `localStorage` e isolamento por namespace de perfil.

---

### 🟡 SEC2-04: Falta de Cabeçalhos HTTP de Segurança e Content Security Policy (CSP)
- **Localização:** `index.html` e configuração do servidor Web
- **Vetor de Exploração:** Não há especificação de `Content-Security-Policy` nas meta tags nem cabeçalhos como `X-Content-Type-Options: nosniff` e `X-Frame-Options: SAMEORIGIN`. Caso um endpoint ou script externo seja comprometido, a ausência de CSP permite injeção de scripts e fontes não confiáveis.
- **Remediação:** Adicionar meta tag com diretivas restritivas de CSP no `index.html` (restringindo scripts a `self`, Google Fonts e Firebase API).

---

### 🟢 SEC2-05: Sanitização na Rasterização de Relatórios com html2canvas
- **Localização:** `src/components/MonthlyReportModal.tsx`
- **Vetor de Exploração:** A exportação em PDF renderiza texto de notas e nomes de categorias informadas pelo usuário diretamente dentro da árvore DOM que é capturada pelo `html2canvas`. Embora o React faça escape de tags HTML por padrão, injeção de caracteres de controle Unicode bidirecionais (Bidi Override) ou estilos em linha podem desfigurar comprovantes financeiros.
- **Remediação:** Adicionar limpeza de caracteres de controle invisíveis e truncamento seguro de campos de texto livre antes de gerar o canvas.

---

## 3. Matriz de Remediação e Plano de Ação

| Fase | Ação | Complexidade | Prioridade |
|---|---|---|---|
| **P1** | Implementar `runTransaction` para operações de liquidação de contas e transferências | Média | Imediata |
| **P2** | Atualizar `firestore.rules` com validação de esquema de dados numéricos e tipos | Baixa | Alta |
| **P3** | Adicionar diretivas de CSP no `index.html` | Baixa | Alta |
| **P4** | Implementar schema validator (Zod ou type-guard defensivo) na leitura do `localStorage` | Baixa | Média |
| **P5** | Higienização de strings contra Unicode Bidi spoofing na geração de relatórios | Baixa | Média |

---

## 4. Templates de GitHub Issues (SEC2)

### Issue SEC2-01: [SEC2-01] Atomicidade em liquidação de contas e movimentações de saldo
```markdown
### Título
[SEC2-01] Implementar transações atômicas no Firestore para liquidação de contas a pagar

### Descrição
Atualmente, o método `handlePayBill` executa operações desacopladas no Firestore para criar a despesa e atualizar o saldo da conta vinculada (PicPay/Banco). Falhas intermitentes de conexão podem gerar inconsistência financeira entre o extrato e o saldo disponível.

### Critérios de Aceite
- [ ] O débito na conta e a marcação de 'pago' na conta devem ocorrer dentro de `runTransaction`.
- [ ] Em caso de falha, nenhuma das duas operações deve persistir.
- [ ] Deve haver feedback visual de erro transacional para o usuário.
```

### Issue SEC2-02: [SEC2-02] Validação estrita de esquema e imutabilidade no firestore.rules
```markdown
### Título
[SEC2-02] Endurecer regras do Firestore contra injeção de campos inválidos e valores negativos

### Descrição
O arquivo `firestore.rules` permite escrita de qualquer payload desde que `request.auth.uid` coincida. É necessário garantir que valores monetários sejam numéricos positivos e que o campo `userId` seja imutável em operações de update.

### Critérios de Aceite
- [ ] Regra `request.resource.data.amount is number && request.resource.data.amount >= 0`.
- [ ] Proibição de alteração do `userId` original em `update`.
- [ ] Deploy das novas regras via ferramenta de integração.
```
