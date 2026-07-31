# Release de seguranca mobile B2B

## Modelo de acesso

O app de colaborador e B2B. O RH adiciona individualmente o e-mail no painel;
um registro `empresa_colaboradores` com assento disponivel e empresa ativa e o
que libera o aplicativo. Criar apenas uma conta no Supabase Auth nao concede
acesso.

Fluxo esperado:

1. RH abre o painel e adiciona nome/e-mail do colaborador.
2. O backend valida o RH, a empresa e o limite de assentos.
3. O colaborador recebe o convite e abre o link no Android/iOS.
4. O app autentica e chama `can_access_mobile_app()`.
5. O vinculo passa de `convidado` para `ativo` no primeiro acesso.

## Ja aplicado em producao (Supabase)

- Migration `20260815_security_hardening.sql` aplicada em 31/07/2026.
- Funcoes sensiveis publicadas com autenticacao e limites de uso.
- Tabelas completas de profissionais e influenciadores bloqueadas para `anon`.
- Buckets `chat-files` e `patient-exams` privados.
- Antigos tokens de convite, setup e indicacao rotacionados.

Convites pendentes criados antes dessa data precisam ser reenviados pelo painel.

## Passos externos obrigatorios antes do piloto

### 1. Publicar o site e os arquivos de associacao

A credencial Vercel local estava expirada durante esta correcao. Depois de
renovar o login:

```powershell
npx vercel login
npx vercel deploy --prod --yes
```

Confirme que estes enderecos devolvem JSON, nunca o `index.html`:

- `https://www.soumalama.com.br/.well-known/assetlinks.json`
- `https://www.soumalama.com.br/.well-known/apple-app-site-association`

### 2. Supabase Auth

Em Authentication > URL Configuration:

- Site URL: `https://www.soumalama.com.br`
- Redirect URL permitida: `https://www.soumalama.com.br/auth/callback`

Nao habilite confirmacao automatica de e-mail. O cadastro publico nao aparece
no app; contas OAuth sem convite podem autenticar, mas o gate B2B recusa o
acesso e as APIs de custo.

### 3. Android / Google Play

O `assetlinks.json` contem o certificado do APK release local:

`C4:8C:06:3D:C4:43:A8:A7:38:0D:E8:1E:A3:B1:F7:B8:CE:0D:8F:0E:81:18:F2:E9:BA:22:F8:67:33:8D:AA:62`

Para distribuicao pela Play Store, adicione tambem o SHA-256 do certificado
"App signing key certificate" mostrado no Play Console. Ele pode ser diferente
da chave de upload local.

Build validado:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npm run build
npx cap sync android
Set-Location android
.\gradlew.bat lintRelease assembleRelease
```

### 4. iOS / Apple Developer

No Identifier `com.malama.saude`, habilite:

- Sign in with Apple
- Associated Domains

Gere novamente o provisioning profile App Store com as duas capabilities. O
entitlement esperado e `applinks:www.soumalama.com.br`. A compilacao final deve
ser executada no Codemagic/macOS; Windows consegue apenas sincronizar e validar
o codigo do projeto.

## Teste de aceite do piloto

1. Tente entrar com um e-mail nao cadastrado pelo RH: deve aparecer "Acesso
   ainda nao liberado" e nenhuma API de IA/video deve aceitar a sessao.
2. Adicione um e-mail novo no painel do RH e confira o consumo de um assento.
3. Abra o convite em um aparelho com o app instalado.
4. Autentique com exatamente o e-mail convidado.
5. Confirme no painel que o status mudou de `convidado` para `ativo`.
6. Remova o colaborador no RH, encerre a sessao e confirme que o proximo acesso
   e recusado.

