'use strict';
const {mapa,entrada,complementares,partes}=require('./consulta-fixture.js');
const {calcularTransitos}=require('../api/_transitos.js');
const {anexar}=require('../api/_estacoes.js');
const {AREA_KEYS}=require('../api/_consulta.js');
function exemplo(){
 const m=mapa(),estudo=calcularTransitos('1990-05-15','2026-11-04',{hora:'10:00',tz:-3,lat:-23.5505,lon:-46.6333});
 const seasons=['outono','outono','inverno','inverno','primavera','primavera','verao','verao','outono','primavera','verao','inverno'];
 const titles=['Separar vontade de cobrança','Dar nome às condições','Preparar uma base possível','Cuidar do ritmo escolhido','Experimentar antes de assumir','Dar espaço à curiosidade','Mostrar o que pode oferecer','Sustentar um acordo seu','Rever o que ficou pesado','Abrir uma nova conversa','Reconhecer o que avançou','Preparar o próximo movimento'];
 const potentials=['Conhecer as responsabilidades permite avaliar o convite com seus próprios critérios.','Uma proposta escrita ajuda você a comparar o que está sendo oferecido.','Organizar informações reduz o peso de decidir com base apenas no receio.','Proteger um horário seu ajuda a perceber quais compromissos consegue manter.','Uma experiência curta permite conhecer a tarefa antes de assumir outra função.','A curiosidade pode orientar uma pergunta que a pesquisa ainda não respondeu.','Você pode mostrar uma capacidade que já usou em uma situação concreta.','Um acordo com prazo de revisão permite observar a mudança no cotidiano.','Rever uma tarefa assumida ajuda a devolver espaço à sua própria escolha.','Uma conversa com objetivo definido pode esclarecer o ponto que continua aberto.','Reconhecer uma entrega feita ajuda a avaliar seus recursos com mais clareza.','Você pode reunir o que aprendeu antes de definir um compromisso novo.'];
 const cares=['Separe a condição real da cobrança que ainda está imaginando.','Confira os termos antes de prometer uma resposta para todos.','Evite reunir tantas informações que a pergunta continue sem prazo.','Observe o cansaço antes de preencher todos os horários livres.','Defina o tamanho do teste antes de aceitar tarefas extras.','Escolha uma dúvida central para não multiplicar conversas sem direção.','Descreva a experiência sem transformar a exposição em prova de valor.','Combine quais responsabilidades pertencem a você e quais são compartilhadas.','Confira o que ainda é necessário antes de renovar um compromisso.','Faça o pedido com clareza e dê tempo para a resposta.','Use um fato observável ao avaliar o que conseguiu sustentar.','Confira sua disponibilidade antes de assumir o próximo passo inteiro.'];
 const steps=['Escreva duas condições que precisa conhecer antes de responder ao convite.','Peça uma descrição das responsabilidades e guarde a resposta recebida.','Reúna as informações do convite em uma página para comparar depois.','Reserve meia hora na semana para conferir sua disponibilidade atual.','Pergunte se pode acompanhar uma tarefa antes de assumir a função.','Anote uma pergunta que mostre o que você deseja experimentar.','Conte uma experiência concreta ligada à responsabilidade da nova função.','Proponha uma revisão do acordo depois das primeiras semanas de trabalho.','Escolha uma tarefa para renegociar e escreva o pedido em duas frases.','Combine uma conversa curta sobre a condição que permanece sem resposta.','Registre uma entrega e o recurso que ajudou você a realizá-la.','Anote o que deseja manter e qual condição ainda precisa esclarecer.'];
 const f={meses:estudo.meses.map((x,i)=>({titulo:titles[i],potencial:potentials[i],cuidado:cares[i],passo:steps[i],estacao:seasons[i],porque:'O foco do mês se liga à construção de critérios para sua escolha.',base_ids:[x.base_numerologica,x.transitos[0]?.id||x.base_setenio]}))};
 const first=estudo.meses[0];
 const d={...partes().d,estacao_alma:{estacao:seasons[0],titulo:'Escolher o que deseja sustentar',
  leitura:'O convite para outra função pode trazer vontade de mudar e receio de perder sua estabilidade. Nesta leitura, o outono destaca a escolha dos compromissos que deseja manter. Comece pelo que precisa conhecer antes de assumir uma responsabilidade maior.',
  porque:'As referências do período reúnem temas de responsabilidade e revisão de escolhas. Seu relato acrescenta um ponto concreto: a conversa adiada mantém em aberto informações necessárias para avaliar a nova função.',
  fase_vida:'Na fase dos 35 aos 42 anos, a pergunta pode ser quais escolhas combinam com a vida que deseja sustentar. Aplique essa pergunta às condições do convite.',
  questao:'Sua próxima decisão depende de conhecer responsabilidades e condições. Organizar essas perguntas permite usar o cuidado com sua autonomia como critério, sem precisar resolver toda a mudança de uma vez.',
  gesto:'Envie uma pergunta sobre as responsabilidades da nova função e combine quando receberá a resposta.',
  ao_longo_do_ano:'A leitura passa da revisão dos compromissos para a preparação de experiências pequenas. Nos meses de maior exposição, o foco é sustentar uma escolha com condições claras.',
  base_ids:[first.base_numerologica,first.base_setenio,first.transitos[0].id]},
  estacoes_areas:Object.fromEntries(AREA_KEYS.map((k,i)=>[k,{estacao:seasons[i],leitura:'Nesta área, o foco é conhecer uma condição concreta antes de assumir um compromisso maior.',base_ids:['area-'+k,first.base_setenio]}]))};
 Object.assign(m.resultado,anexar(f,'f',estudo),anexar(d,'d',estudo));
 m.resultado.dados_pessoa={...m.resultado.dados_pessoa,tz:-3,lat:-23.5505,lon:-46.6333,data_referencia:'2026-11-04'};
 const teste={versao_consulta:2,versao_estacoes:1,contexto_atual:entrada,contextos_complementares:complementares,guardiao_principal:{nome:'Controle'},potencial_principal:{nome:'Autonomia'},respostas:Array.from({length:10},(_,i)=>({pergunta:'Pergunta de exemplo '+(i+1),resposta:'Prefiro conhecer as condições antes de responder.'}))};
 const dossier={pessoa:{hora:'10:00',tz:-3,lat:-23.5505,lon:-46.6333,nascimento_iso:'1990-05-15'},areas:Array.from({length:12},(_,i)=>({casa:i+1,area:AREA_KEYS[i]}))};
 return {mapa:m,estudo,f,d,teste,dossier,dadosCiclos:{nascimento:'1990-05-15',referencia:'2026-11-04'}};
}
function respostaIA(parte,fase,estudo){
 const local=m=>[m.base_numerologica,m.base_setenio,...m.transitos.map(t=>t.id)];
 const wire=(p,m)=>{const {base_ids,...rest}=p;return {...rest,bases:base_ids.filter(id=>!id.startsWith('area-')).map(id=>local(m).indexOf(id))};};
 if(fase==='f')return {meses:parte.meses.map((p,i)=>({...wire(p,estudo.meses[i]),periodo:estudo.meses[i].ano+'-'+String(estudo.meses[i].mes).padStart(2,'0')}))};
 if(fase==='d')return {...parte,estacao_alma:wire(parte.estacao_alma,estudo.meses[0]),estacoes_areas:Object.entries(parte.estacoes_areas).map(([area,p])=>({...wire(p,estudo.meses[0]),area}))};
 return parte;
}
module.exports={exemplo,respostaIA};
