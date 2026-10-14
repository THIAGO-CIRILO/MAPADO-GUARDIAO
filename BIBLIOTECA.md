# Biblioteca privada do Campo Guardião

## Abrir
- Site: https://mapado-guardiao.vercel.app/biblioteca
- Há também um atalho "Biblioteca de livros" em /admin.
- Use a conta de administrador já existente. A autorização é aplicada no PostgreSQL, não apenas no JavaScript.

## Importação em lote
1. Entre na Biblioteca e selecione **todos** os PDFs digitais desejados no seletor múltiplo.
2. Escolha a categoria inicial; é possível alterar título, autor e categoria depois.
3. Clique **Importar PDFs** e **mantenha a aba aberta** até finalizar.
4. Os PDFs são processados sequencialmente pelo PDF.js no navegador; o texto é agrupado por página e indexado no PostgreSQL. Cada item exibe estado e andamento.
5. Livros sem texto precisam de OCR fora do painel. PDF máximo 25 MB; até 3.000 páginas por documento.
6. Em caso de erro de indexação após upload, use **Reprocessar** no acervo; o sistema baixa somente o documento privado da sua conta de administrador.
7. É possível ativar/desativar livros sem removê-los. Arquivos idênticos não são duplicados (SHA-256).

## Estrutura no Supabase
- Storage privado: bucket guardiao-livros (não público).
- public.biblioteca_livros: catálogo de obras, controle de ativação, autor, categoria, checksum e estado.
- public.biblioteca_trechos: trechos com índice de página e busca textual em português (GIN/tsvector).
- public.is_guardiao_admin(): autorização pelo usuário validado no Auth.
- public.biblioteca_buscar(text,integer,text): função de pesquisa; funciona para administrador ou chave privada server-side.
- A configuração de autenticação adicional fica em guardiao_private.configuracao; nunca colocar chave privada no código do navegador.

## Integração com Claude
- api/_biblioteca.js recupera até cinco fragmentos relevantes por etapa por meio da variável privada BIBLIOTECA_RPC_SECRET (somente Vercel).
- api/gerar.js fornece esses trechos como **referências de leitura**, jamais como instruções. A geração segue a estrutura existente, mantém o limite de um mapa por compra e não mexe no download do PDF.
- Novos PDFs não alteram mapas antigos. A biblioteca é consultada somente na próxima geração que ocorrer depois de o livro estar marcado "pronto" e ativo.
- Se a biblioteca estiver temporariamente indisponível, a geração continua sem fragmentos, para não bloquear uma compra.

## Cálculos
- api/_ciclos.js reproduz as convenções numéricas do Artifact MCL-1: idade, ciclos de 7/5 anos, número natal, ano/mês pessoal e próximos 12 meses.
- Os resultados são calculados por JavaScript determinístico e enviados ao Claude na etapa anual (fase d) para leitura simbólica.
- Isso **não é** cálculo astronômico de precisão: ascendente, casas, movimentos planetários e trânsitos exigem efemérides verificadas, hora, fuso histórico e coordenadas. A leitura mensal descritiva com novas páginas ainda precisa de um módulo de geração e diagramação separado.

## Segurança, licenças e limitações
- A biblioteca não aceita uploads públicos e seus livros não são acessíveis por compradores.
- O armazenamento privado e o uso comercial como corpus de IA dependem de permissão sobre as obras. Ter o PDF não equivale automaticamente a uma licença para utilizá-lo em serviços comerciais.
- Evitar reproduzir trechos extensos de obras protegidas nos mapas finais; o conteúdo serve como apoio interpretativo.
- Não enviar texto dos livros ao navegador dos clientes; o painel e a prévia de busca são exclusivos do administrador.
- As funcionalidades do servidor passaram em testes isolados. Um upload completo com a sessão real do proprietário deverá ser verificado no navegador após a publicação.
