const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((e)=>{
      console.log(e);
    });

});

function handleEvent(event) {
  
  
  /*** DECLARE ***/
  const fs = require('fs');
  const group_session = read('group_session.json'); //kalo ada error JSON di position di comment aja line ini

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  
  /*** CHECKER v.0.2 ***/ //ketriger kalo user masukin text
  if (group_session.status == 'active'){  
      /*** NOON TIME ***/
      /**
      jadi buat pengaturan waktu : idle > malam > pagi(belom vote), dipagi, selalu cek kemenangan > noon(vote) > lynch or malam lagi
      **/
      if (group_session.noon == false){//untuk game asli, ini ubah ke sesi malam 
          noonTime();
      }
      if (group_session.noon == true && group_session.state == 'vote'){
        let voters = [];
        for (var i = 0; i<group_session.players.length; i++){
          if (group_session.players[i].vote == 'pending'){
            voters.push(group_session.players[i].id);
          }
        }
        let text = 'vote siapa dibawah ini : ';
        text += '\nDengan /vote angka';
        text += '\n' + sendPlayerList();
        multi(voters, text);
      }
    
    if (group_session.vote == true && group_session.state !== 'lynch'){
      /**group_session.state = 'lynch';
      group_session.lynch_candidate.agree = 0;
      group_session.lynch_candidate.disAgree = 0;
      saveData(group_session);**/
      console.log('sudah bukan sesi vote lagi');
    }
    
        /*** NIGHT TIME ***/
        
        /*** DAY TIME ***/
      
    
  }
  
  if (event.message.text.startsWith('/')){
    
    var args = event.message.text.split(" "); //untuk memisahkan kata
    
    if (event.source.type === 'group'){
      
      switch(args[0]){
        case '/stop':
          return stopCommand();

        case '/check':
          return checkCommand();

        case '/new':
          return newCommand();

        case '/join':
          return joinCommand();
          
        case '/cancel':
          return cancelCommand();
          
        case '/player':
          return playerCommand();
          
        case '/start':
          return startCommand();

        case '/inno':
          return innoCommand();
          
        case '/guilty':
          return guilyCommand();
                    }
    //Checker V.0.1 (ke trigger kalau ada "/")  
      
      
    } else if (event.source.type === 'user' && group_session.status !== 'idle'){
      let index = indexOfPlayer();
      if (group_session.players[index].status == 'alive'){
        switch(args[0]){
          case '/vote':
            return voteCommand();
            
          case '/who':
            return seerCommand(); //and fool
            
          case '/kill':
            return hunterCommand();
            
                      }
      }
    } else {
       return reply('invalid command'); 
    }
    
    
    
    
    /*** COMMANDS LIST ***/
    function voteCommand(){
      let index = indexOfPlayer();
      if (index == -1){
        return reply('kamu gak register di game');
      }
      
      if (group_session.noon !== true){
         return reply('belum saatnya voting'); 
      }
      
      if (group_session.players[index].vote == 'done'){
        return reply('kamu suda ngevote');
      }
      
      let target_index = searchPlayer(args[1]);
      if (target_index == -1){
        return reply('masukkan angka');
      }
      
      if (group_session.players[target_index].status == 'death'){
        return reply('dia dh mati');
      }
      
      if (group_session.players[target_index].id == group_session.players[index].id){
        return reply('ga bisa vote diri sendiri bung');
      }
      
      push(group_session.players[index].groupId,group_session.players[index].name + ' ngevote ' + group_session.players[target_index].name);
      group_session.players[target_index].choosen++;
      group_session.players[index].vote = 'done';
      saveData(group_session);
    }
    
    function stopCommand(){
      var group_session = {
        status : 'idle',
        noon : false,
        vote : false,
        state : 'idle',
        players : [],
        lynch_candidate : '',
      }
      saveData(group_session);
      
      reply('game stop huehue');
    }
    
    function checkCommand(){
      console.log(group_session);
      if (group_session.status == 'idle'){
        return reply('game belum dibuat');
      }
      
      if (group_session.status == 'new'){
        return reply('game belum dimulai');
      }
      
      if (group_session.status == 'active'){
        if (group_session.noon == true){
          if (group_session.state == 'vote'){
            let alive = [];
            group_session.players.forEach(function(item){
              if (item.status == 'alive'){
                alive.push(item);
              }  
            });
            
            let alive_pending_vote = [];
            group_session.players.forEach(function(item){
              if (item.status == 'alive' && item.vote == 'pending'){
                alive_pending_vote.push(item.name);
              }  
            });
            
            //ubah ke checker v.0.2 atau ke /vote command
            //soalnya jadi harus /check 2 kali
            if (alive_pending_vote.length == 2){ //debug ubah ke o nnanti
              //buat debug jaga jaga ada yang divote sama rata, kalau ada yang sama rata, ke nightTime()
              group_session.vote = true;
              saveData(group_session);
              for (var i = 0; i<alive.length; i++){
                if (alive[i].choosen > alive.length/2){ //buat debug, item.choosen > 0 aja def: alive.length/2
                  //langsung aja return LynchCommand(item); --> lynch command kasihtau siapa yg akan dilynch, kasih inno / guilty
                  group_session.lynch_candidate = alive[i];
                  saveData(group_session);
                  return lynchCommand(alive[i]);
                } else {
                  //return nightTime();
                }
              }
            }
            
            let cnt = 1;
            let text = 'Yang belom vote : \n';
            alive_pending_vote.forEach(function(item, index){
              text += '' + cnt + '. ' + item + '\n';
              cnt++;
            });
            reply(text);
          }
        }
      }
      
    }
    
    function lynchCommand(player){
      //yg bisa vote inno, guilty cman yg idup
      //player isinya name, id, status, role
      //console.log(group_session.lynch_candidate);
      let text = 'Yak, ' + player.name + ' kamu dicurigai ww, berikan pembelaanmu\n\n';
      text += 'ketik /inno jika kamu memilih ' + player.name + ' untuk dibebasin\n';
      text += 'ketik /guilty jika kamu mau dia digantung';
   
      reply(text);
    }
    
    function innoCommand(){
      if (group_session.status == 'idle'){
        return reply('ga ada game yang berjalan, ketik /new');
      }
      
      if (group_session.status !== 'new'){
        return reply('game sudah berjalan, tnggu next game');
      }
      
      if (group_session.noon == false){
        return reply('bukan saatnya voting');
      }
      
      if (group_session.lynch_candidate == ''){
        return reply('bukan saatnya votingg');
      }
      
      let candidate = group_session.lynch_candidate;
      let index = indexOfPlayer();
      if (group_session.players[index].status == 'death'){
        return reply(group_session.players[index].name + ' , lu dah mati, ga bisa ikut vote wkwk');
      }
      
      //nah ini buat candidate.agree = 0;
      
    }
    
    function newCommand(){
      if (group_session.status !== 'idle'){
        return reply('game sedang berjalan');
      }
      group_session.status = 'new';    
      group_session.players = [];
      saveData(group_session);
      reply('game telah dibuka kuy join');
      
    }
    
    function joinCommand(){
      if (group_session.status == 'idle'){
        return reply('ga ada game yang berjalan, ketik /new');
      }
      
      if (group_session.status !== 'new'){
        return reply('game sudah berjalan, tnggu next game');
      }
      
      if (group_session.players.length == 0){
        addPlayer({
        id      : event.source.userId,
        status  : 'alive',
        role    : 'villager',
        vote    : 'pending',
        choosen : 0,
        groupId : event.source.groupId
        });
        
        saveData(group_session);
        return getName();
      }
      
      var index = indexOfPlayer();
      
      if (index == -1){
        addPlayer({
          id      : event.source.userId,
          status  : 'alive',
          role    : 'villager',
          vote    : 'pending',
          groupId : event.source.groupId,
          choosen : 0
          });

          saveData(group_session);
          getName();
      } else {
        return reply('you have joined');
      }
    }
    
    function cancelCommand(){
      if (group_session.status == 'idle'){
        return reply('no game running');
      }
      
      if (group_session.status !== 'new'){
        return reply('game sudah berjalan, main aje');
      }
      
      if (indexOfPlayer() == -1){
        return reply('you are not registered');
      }
      
      let index = indexOfPlayer();
      let name = group_session.players[index].name;
      group_session.players[index].status = 'death';
      
      for (var i = index; i<group_session.players.length-1; i++){
        group_session.players[i] = group_session.players[parseInt(i)+1];
      }
      group_session.players.pop();
      saveData(group_session);
      
      let text = name + ' leave the game\n\n';
      
      if (group_session.players.length == 0){
         return stopCommand(); 
      }
      
      text += sendPlayerList();
      reply(text);
    }
    
    function playerCommand(){
      if (group_session.status == 'idle'){
        return reply('no game running');
      }
      reply(sendPlayerList());
    }
    
    function startCommand(){
      if (group_session.status == 'idle'){
        return reply('game blum dibuat, ketik /new');
      }
      
      if (group_session.status !== 'new'){
        return reply('game udah di start');
      }
      
      if (indexOfPlayer() == -1){
         return reply('you are not registered'); 
      }
      
      if (group_session.players.length < 3){
         return reply('min 3 pemainlah');
      }
      
      group_session.status = 'active';
      group_session.noon = false;
      saveData(group_session);
      let text = 'bagi role...';
      randomRole();
      reply(text);
    }
    
    
    
    
    
  }
  
  /*** FUNCTION ***/
  
  /*** TIME ***/
  function noonTime(){
    let text = 'Sekarang sudah senja, dan warga akan vote siapa yang jadi werewolf';
    group_session.noon = true;
    group_session.state = 'vote';
    saveData(group_session);
    reply(text);
  }
    
  /*** DATA LIST ***/
    
  function saveData(data){
    let file = 'group_session.json';
    var raw = JSON.stringify(data, null, 2);
    fs.writeFileSync(file, raw);
  }
    
  function read(file){
    var raw = fs.readFileSync(file);
    var data = JSON.parse(raw);
    return data;
  }
  
  /*** OPERATION LIST ***/
  
  function shuffleArray(o){
      for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
      return o;
    }
    
  function randomRole(){
    let villager = [];
    let hunter = [];
    shuffleArray(group_session.players);
    group_session.players[0].role = 'hunter';
      
    saveData(group_session);
    for (var i = 0; i<group_session.players.length; i++) {
      if (group_session.players[i].role == 'villager'){
        villager.push(group_session.players[i].id);
      }
        
      if (group_session.players[i].role == 'hunter'){
        hunter.push(group_session.players[i].id);
        push(group_session.players[i].id, 'kau hunter');
      }
    }
    shuffleArray(group_session.players);
    saveData(group_session);
    multi(villager, 'role kamu adalah villager');
  }
  
  function addPlayer(new_player){
    group_session.players.push(new_player);
  }
  
  function searchPlayer(i){
    let found = -1;
    if (isNaN(i) == true){
      return found = -1;
    }
    found += parseInt(i);
    return found;
  }

  function indexOfPlayer(){
    let found = -1;
    for (var i in group_session.players) {
      if (group_session.players[i].id === event.source.userId) {
        found = i;
      }
    }

    return found;
  }
  
  function getName(){
    client.getProfile(event.source.userId)
        .then((profile) => {
          var name = profile.displayName;
          group_session.players[indexOfPlayer()].name = name;
          saveData(group_session);
          return reply(name + ' join the game');
      });
  }
 
    
  /*** MESSAGE LIST ***/
      
  function sendPlayerList(){
    let reply_text = 'List of player(s):\n';
    //let border = '=========\n';
    //reply_text += border + '        alive\n' + border;
    for (var i = 0; i < group_session.players.length; i++) {
      let num = i + 1;
      reply_text += '' + num + '. ' + group_session.players[i].name + ' = ' + group_session.players[i].status +'\n';
    }
    return reply_text;
  }
    
  function reply(text){
    client.replyMessage(event.replyToken,{
    type : "text",
    text : text,
    });
  }
  
  function push(user, text){
    client.pushMessage(user,{
      type : 'text',
      text : text,
    });
  }
  
  function multi(arr, text){
    client.multicast(arr,{
      type : 'text',
      text : text,
    });
  }
  
}


// listen on port
const port = 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
