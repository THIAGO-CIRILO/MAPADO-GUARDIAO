const areas=[
 ['Identidade','Como você se percebe e se posiciona. Um olhar para sua forma de iniciar ciclos e expressar quem é.'],
 ['Recursos','Sua relação com os próprios recursos, com o dinheiro e com aquilo que você valoriza e deseja sustentar.'],
 ['Comunicação','Sua maneira de se expressar, aprender e trocar com as pessoas no cotidiano.'],
 ['Família e raízes','Pertencimento, vínculos familiares e as referências que formam a sua base.'],
 ['Criatividade','Sua expressão criativa, seus interesses e o espaço que você abre para o prazer e a espontaneidade.'],
 ['Rotina e bem-estar','A organização dos seus dias e a relação entre hábitos, responsabilidades e cuidado consigo.'],
 ['Relações','Parcerias, acordos e a forma como você se coloca nos encontros com o outro.'],
 ['Transformações','Encerramentos, mudanças profundas e sua relação com o que pede uma nova resposta.'],
 ['Estudos e sentido','Crenças, aprendizados e o que amplia a sua visão de mundo.'],
 ['Trabalho e direção','Sua relação com o trabalho, suas responsabilidades e o caminho que deseja construir.'],
 ['Amizades e projetos','Os grupos aos quais você pertence, as trocas que sustenta e os projetos para o futuro.'],
 ['Mundo interior','Recolhimento, espiritualidade e aspectos da sua experiência que pedem escuta e elaboração.']
];
const areaButtons=document.querySelectorAll('[data-area]');
areaButtons.forEach(button=>button.addEventListener('click',()=>{
 const index=Number(button.dataset.area);
 areaButtons.forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
 document.querySelector('#area-number').textContent=String(index+1).padStart(2,'0');
 document.querySelectorAll('[data-sector]').forEach(sector=>sector.classList.toggle('active',Number(sector.dataset.sector)===index));
 document.querySelector('#area-title').textContent=areas[index][0];
 document.querySelector('#area-description').textContent=areas[index][1];
}));
const messages={
 pdf:'Oi, Thiago! Quero contratar a Mandala da Vida 2027 completa em PDF, por R$250, com a leitura dos 12 meses e das 12 áreas da vida. Como funciona a contratação e qual é o prazo de entrega?',
 completo:'Oi, Thiago! Quero contratar a experiência completa do Mapa 2027, por R$600: mandala completa em PDF, ativação de abertura de caminhos e sessão individual de 2 horas e meia com você. Como funciona e quais são os horários disponíveis?',
 duvida:'Oi, Thiago! Quero saber mais sobre a Mandala da Vida 2027 e entender qual das duas opções faz sentido para mim.'
};
document.querySelectorAll('[data-plan]').forEach(link=>{link.href='https://wa.me/5516991326614?text='+encodeURIComponent(messages[link.dataset.plan]);});
const mobileCta=document.querySelector('.mobile-cta');
if('IntersectionObserver' in window){new IntersectionObserver(entries=>{mobileCta.classList.toggle('hidden',entries[0].isIntersecting);},{threshold:0}).observe(document.querySelector('#opcoes'));}
