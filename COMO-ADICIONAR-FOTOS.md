# Como adicionar as fotos reais do Lagamar Paulista

A estrutura para fotos reais já está pronta no banco e na interface — falta só você subir os
arquivos de imagem. Enquanto isso, cada local mostra um placeholder ilustrado (nunca um link
quebrado).

## Onde subir

No painel do Supabase (https://supabase.com/dashboard/project/gcndwtswmtsivhheqyhv), vá em
**Storage → location-photos** e crie os arquivos com **exatamente estes nomes de caminho**:

| Painel | Local | Caminho exato do arquivo |
|---|---|---|
| Espectro físico e sonoro | Valo Grande | `valo-grande/canal-1.jpg` |
| Espectro físico e sonoro | Ilha do Cardoso | `ilha-cardoso/nucleo-pereque-1.jpg` |
| Espectro físico e sonoro | Quilombo do Mandira | `quilombo-mandira/vista-1.jpg` |
| Hidrodinâmica | Ponto A (Iguape) | `iguape/ponte-laercio-ribeiro-1.jpg` |
| Hidrodinâmica | Ponto B (Cananéia) | `cananeia/mar-cananeia-1.jpg` |
| Ecossistemas | Manguezal | `ilha-cardoso/manguezal-1.jpg` |
| Ecossistemas | Restinga | `ilha-cardoso/restinga-1.jpg` |
| Ecossistemas | Mata Atlântica | `ilha-cardoso/mata-atlantica-1.jpg` |
| Mundo do Trabalho | Pesca em Iguape | `iguape/pesca-artesanal-1.jpg` |
| Mundo do Trabalho | Pesca em Cananéia | `cananeia/pesca-artesanal-1.jpg` |
| Mundo do Trabalho | Ostras (Mandira) | `quilombo-mandira/cultivo-ostras-1.jpg` |

O caminho precisa bater exatamente (incluindo a subpasta) — é assim que a aplicação sabe qual
foto pertence a qual local.

## Adicionar mais de uma foto por local

Pode subir várias fotos do mesmo lugar. Basta usar um nome diferente na mesma subpasta, por
exemplo `valo-grande/canal-2.jpg`, `valo-grande/ponte-1.jpg` etc., e cadastrar cada uma como uma
nova linha na tabela `location_photos` (posso fazer isso para você se me passar a lista de
arquivos que subiu).

## O que a aplicação faz automaticamente

- Se a foto existe: aparece como miniatura clicável; ao clicar, abre em tela cheia (lightbox),
  com legenda e navegação por setas (ou teclado ← →) quando há mais de uma foto no mesmo local.
- Se a foto ainda não existe: aparece um aviso ilustrado, nunca uma imagem quebrada.
- Se o arquivo existe mas o link deu problema: a miniatura fica esmaecida com aviso de "foto
  indisponível", sem travar o resto da página.

## Créditos e legendas

Se quiser trocar a legenda ou adicionar o crédito do fotógrafo, me avise — são só duas colunas
(`caption`, `credit`) na tabela `location_photos`, fáceis de atualizar.
