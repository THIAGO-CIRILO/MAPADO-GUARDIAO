(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./consulta-entrada.js'));
 else root.GuardiaoConsulta=factory(root.GuardiaoEntrada);
})(typeof globalThis!=='undefined'?globalThis:this,function(Entrada){
 'use strict';
 const areas=[['identidade','Identidade e corpo'],['dinheiro','Dinheiro e valores'],['comunicacao','Comunicação e estudos'],['familia','Casa e família'],['criatividade','Criatividade e prazer'],['rotina','Trabalho diário e saúde'],['relacionamentos','Relacionamentos'],['intimidade','Crises e intimidade'],['proposito','Propósito e expansão'],['carreira','Carreira e reconhecimento'],['coletivos','Amigos e coletivos'],['interioridade','Espiritualidade e interioridade']];
 const meditacao=[
  ['Primeiro minuto','Encontre uma posição confortável. Você pode manter os olhos abertos. Olhe ao redor e escolha um objeto. Perceba uma cor e um detalhe dele. Se quiser mudar de posição, mude. Use este tempo no seu ritmo.'],
  ['Segundo minuto','Perceba um apoio confortável: os pés no chão ou as costas na cadeira. Se preferir, continue olhando para o objeto. Deixe a respiração seguir sem esforço. Você pode apenas notar o que está ao seu redor.'],
  ['Terceiro minuto','Se a questão voltar à sua cabeça, perceba que ela voltou. Você terá espaço para olhar para isso na leitura. Agora, volte ao objeto ou a um som do ambiente. Repita esse movimento de atenção com calma.'],
  ['Quarto minuto','Traga sua pergunta por um instante. Qual parte dela precisa de atenção hoje? Escolha um ponto para levar à leitura. Pode ser uma conversa ou uma dúvida que deseja compreender. Depois, volte a observar o ambiente.'],
  ['Quinto minuto','Perceba como está agora. Você pode continuar ou preferir mais tempo. Se estiver confortável, movimente as mãos e olhe ao redor. Ao abrir a leitura, comece pela parte ligada à sua pergunta. Leia um trecho de cada vez.']
 ];
 const promessa={inicio:'O seu lugar de potência é onde',destaque:'a sua energia rende mais e custa menos.'};
 const clean=v=>typeof v==='string'?v.trim():'';
 const card=(label,body,items)=>({label,body:clean(body),items:(items||[]).map(clean).filter(Boolean)});
 function paginas(map,profile={}){
  const r=map.resultado||map.gt?.res||{};
  if(r.versao_consulta!==2)throw new Error('Esta leitura usa o formato anterior.');
  const input=Entrada.contexto(r.entrada_consulta||map.respostas?._consulta||map.gt?.ans?._consulta);
  const pessoa=r.dados_pessoa||{};
  const nome=pessoa.nome||profile.nome||map.name||'Sua leitura';
  const g=r.guardiao||{},f=r.ferida||{},p=r.potencial||{},pl=r.plano||{};
  const bases=r.bases_leitura||{},arc=r.arcano_pessoal||null;
  const lugar=clean(r.lugar_potencia?.titulo)&&clean(r.lugar_potencia?.leitura)?r.lugar_potencia:{titulo:map.potencial||'Seu potencial em uso',leitura:p.leitura,gesto:p.primeiro_gesto};
  if(areas.some(([k])=>!r.areas_vida?.[k]?.texto)||r.tabela_consulta?.length!==6||r.meses?.length!==12||pl.dias?.length!==7)throw new Error('A leitura de consulta rápida ainda está incompleta.');
  const pages=[];
  function add(title,section,intro,blocks=[],table){pages.push({title,section,intro:clean(intro),blocks,table});}
  add('Mapa do Guardião','SUA LEITURA PESSOAL',promessa.inicio+' '+promessa.destaque,[
   {...card(lugar.titulo,lugar.leitura,[lugar.gesto]),kind:'potencia',eyebrow:'Seu lugar de potência'},
   card(nome,r.abertura),card('Sua questão',input.questao),card('Um foco por consulta','As 12 áreas ajudam a olhar sua questão por diferentes ângulos. Consulte a parte de que precisa e use a tabela para preparar uma resposta.'),card('Thiago Cervi','Material de consulta rápida · Leitura individual em 20 páginas.')
  ]);
  add('Como usar o seu mapa','COMECE POR AQUI','Antes da primeira leitura, ouça a meditação. Retome sua questão, consulte a área ligada à situação e use a tabela para preparar uma resposta. Escolha uma ação e defina quando vai experimentá-la.',[],{headers:['Procure aqui','Página'],rows:[['Sua questão',3],['Guardião e potencial',4],['Reconhecer, Honrar e Atualizar',5],['Mapa natal, numerologia e arcano',6],['Identidade e dinheiro',7],['Comunicação e família',8],['Criatividade e rotina',9],['Relacionamentos e intimidade',10],['Propósito e carreira',11],['Coletivos e interioridade',12],['Seus próximos 12 meses',13],['Continuação dos meses',14],['Sua tabela de consulta',15],['Possíveis desdobramentos',16],['Uma ação em 72 horas',17],['Prática de cinco minutos',18],['Sete dias para experimentar',19],['Seu próximo passo',20]],widths:[.89,.11],links:true});
  add('A questão que você trouxe','PARTE 1 · SUA QUESTÃO ATUAL','Suas palavras são o ponto de partida desta leitura.',Entrada.campos.map(c=>card(c.titulo,input[c.key])));
  add('Sua proteção e seu potencial','O QUE A LEITURA ENCONTROU',r.integrada,[card(map.guardiao||'Seu Guardião',g.leitura+'\n\nO que preserva: '+g.beneficio+'\n\nO custo atual: '+g.preco),card('A ferida como referência simbólica',f.leitura),card(map.potencial||'Potencial em uso',p.leitura),card('Primeiro gesto',p.primeiro_gesto)]);
  add('Reconhecer · Honrar · Atualizar','DA LEITURA À RESPOSTA','Use os movimentos numa cena concreta. Você pode voltar aqui antes de responder a um pedido ou tomar uma decisão.',[
   card('Reconhecer','Observe o que aconteceu, o pensamento que apareceu e sua reação mais rápida. Sua descrição: '+input.reacao),
   card('Honrar','Nomeie o que essa resposta tenta preservar. Seu receio: '+input.receio),
   card('Atualizar','Escolha outra forma de responder, com uma frase ou uma ação que caiba agora. O que você deseja: '+input.desejo),
   card('Uma frase para experimentar',r.frase_nova)
  ]);
  add('Sua leitura e o momento atual','MAPA NATAL E CICLOS','Relacione as referências da leitura à questão concreta que você trouxe.',[
   card('Dados desta leitura',nome+' · Nascimento: '+(pessoa.nascimento||profile.nascimento||'não informado')+' · Hora: '+(pessoa.hora||profile.hora||'não informada')+' · Local: '+(pessoa.cidade||profile.cidade||(Number.isFinite(pessoa.lat)&&Number.isFinite(pessoa.lon)?pessoa.lat+', '+pessoa.lon:'não informado'))),card('Mapa natal',bases.natal),card('Numerologia e fases da vida',bases.numerologia),card(arc?'Arcano pessoal · '+arc.numero+' · '+arc.nome:'Arcano pessoal',bases.arcano),
   card('Como foi calculado',arc?.metodo||'Não calculado nesta leitura.')
  ]);
  const titles=['Sua autonomia e seus recursos','Conversas e responsabilidades','O espaço da sua rotina','Vínculos e acordos','Direção e trabalho','Trocas e vida interior'];
  for(let i=0;i<6;i++)add(titles[i],'AS 12 ÁREAS DA VIDA','Consulte a área ligada à sua pergunta e escolha uma aplicação possível.',areas.slice(i*2,i*2+2).map(([key,label])=>card(label,r.areas_vida[key].texto,['Um passo possível: '+r.areas_vida[key].gesto])));
  for(let i=0;i<2;i++)add('Seus próximos doze meses',i===0?'CONSULTA AO LONGO DO TEMPO':'CONSULTA AO LONGO DO TEMPO · CONTINUAÇÃO',i===0?'Um tema, um cuidado e uma ação para cada mês, a partir da referência da sua leitura.':'',[],{headers:['Mês','Tema e recurso','Cuidado','Ação possível'],rows:r.meses.slice(i*6,i*6+6).map(m=>[String(m.mes).padStart(2,'0')+'/'+m.ano,m.titulo+'. '+m.potencial,m.cuidado,m.passo]),widths:[.13,.33,.25,.29]});
  const headers=['Situação possível','Reconhecer','Honrar','Atualizar'];
  const rows=r.tabela_consulta.map(t=>[t.situacao,t.reconhecer,t.honrar,t.atualizar]);
  add('Sua tabela de consulta rápida','RECONHECER · HONRAR · ATUALIZAR',input.questao,[card('Como consultar','Procure uma cena próxima da sua. Reconhecer mostra o que observar. Honrar ajuda a compreender a necessidade envolvida. Atualizar traz uma frase ou ação possível.')],{headers,rows:rows.slice(0,3),widths:[.24,.25,.24,.27]});
  add('Se a questão aparecer de outro jeito','POSSÍVEIS DESDOBRAMENTOS','Estas cenas são possibilidades relacionadas à sua questão. Use a linha que se aproxima da situação que estiver vivendo.',[card('Da leitura para uma conversa','Prepare sua resposta e confira se ela cabe nas condições que você tem hoje. Você pode adaptar a frase à sua maneira de falar.')],{headers,rows:rows.slice(3),widths:[.24,.25,.24,.27]});
  add('Uma ação para as próximas 72 horas','SEU RESULTADO CONCRETO','Escolha uma ação que ajude a esclarecer ou movimentar a questão. Ao terminar, registre o que fez e o que percebeu.',[
   card('Seu combinado',pl.h72),card('Antes de começar','', ['O que vou fazer: uma ação específica.','Quando vou fazer: um prazo nas próximas 72 horas.','Do que preciso: informação, recurso ou uma conversa.','O que vou observar para avaliar o próximo passo.']),card('Se a ação ficou grande','Reduza a etapa. Preparar uma pergunta pode ser suficiente quando ainda falta informação para uma decisão.')
  ]);
  add('Cinco minutos para uma situação','PRÁTICA DEPOIS DA LEITURA','Esta prática organiza uma resposta no dia a dia. Ela é diferente da meditação de preparação.',[
   card('Sua prática',pl.min5),card('Um minuto para cada movimento','', ['Descreva o que aconteceu.','Reconhecer: observe sua reação e o pensamento que apareceu.','Honrar: nomeie o que tentou preservar.','Atualizar: escolha uma frase ou ação possível.','Defina quando vai experimentar essa resposta.']),card('Depois do teste','Anote o que fez e o que aconteceu. Se ficou difícil, ajuste o tamanho da ação ou identifique o apoio de que precisa.')
  ]);
  add('Sete dias para experimentar','ACOMPANHE O USO DO MAPA','Use esta sequência como uma organização possível. Ajuste o ritmo quando a situação exigir mais tempo.',[],{headers:['Dia','Uma ação por dia'],rows:pl.dias.map((t,i)=>[i+1,t]),widths:[.11,.89]});
  add('Seu próximo passo','PARA VOLTAR QUANDO PRECISAR','Retome a pergunta que trouxe. Registre o que ficou mais claro e qual ação deseja experimentar agora.',[
   card('Sua direção',r.objetivo?.proximo_passo),card('Leve uma resposta para a vida real','', ['Minha questão de agora é…','O que consegui compreender foi…','O próximo passo que vou experimentar é…','Vou fazer isso até…']),card('Quando quiser aprofundar','Se precisar de ajuda para relacionar a leitura à situação que está vivendo, você pode seguir comigo em uma sessão individual. Entre em contato para conhecer o atendimento e agendar.\ncontato.energystudio@gmail.com'),card('Thiago Cervi','Mapa do Guardião · Reconhecer, Honrar e Atualizar.')
  ]);
  // Keep the text intact. Only presentation metadata changes between editions.
  pages[0].cover=true;pages[0].promessa=promessa;
  pages.forEach((page,index)=>page.blocks.forEach((block,i)=>{
   block.tone=index===0?(i<3?'outline':i===3?'soft':'plain'):
     index===2?'outline':index===4&&i===3?'soft':
     index===5&&i===0?'outline':index===5&&i===4?'soft':
     [14,15].includes(index)?'soft':index===16&&i===1?'soft':
     index===17&&i===1?'soft':index===19&&i===1?'soft':'plain';
  }));
  if(pages.length!==20)throw new Error('O mapa precisa ter exatamente 20 páginas.');
  return pages;
 }
 return {areas,meditacao,paginas};
});
