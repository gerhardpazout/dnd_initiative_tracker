console.log('js works!')

function readFile() {
    var fileHandler = new FileHandler2();
    fileHandler.init();

    setTimeout(function(){
        var creatureList = new CreatureList(fileHandler.json);
        creatureList.init();
    },500);
}


class File {
    constructor(file) {
        this.originalFile = file;
        this.content = null;
        this.extension =  this.getFileExtensionFromFile(file);
    }

    name(){
        return this.file.name;
    }
    getFileExtensionFromFile(file) {
        return file.name.split('.').pop().toLowerCase();
    }

    getOriginalFile() {
        this.originalFile = file;
    }
}
class FileHandler2 {
    constructor() {
        this.file = document.querySelector("input[type=file]").files[0];
        this.reader = new FileReader();
        this.content = '';
        this.json = '';
    }

    // code from https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsText
    init() {
        this.reader.addEventListener(
            "load",
            () => {
              this.content = this.reader.result;
              //setTimeout(this.parseFile(),2000);
              this.parseFile();
            },
            false,
        );
        
        if (this.file) {
            this.reader.readAsText(this.file);
        }

    }

    parseFile() {
        console.log("parsing file...");
        switch(this.file.type) {
            case "application/json":
                this.parseJSON();
                break;
        }
    }

    parseJSON() {        
        this.json = JSON.parse(this.content);
    }
}

class CreatureList {
    constructor(json) {
        this.creatures = json.creatures;
        this.el = document.getElementById('creature-list');
        this.formNew = document.getElementById('form-creature-new');
        this.formEdit = document.getElementById('form-creature-edit');
        this.prevTurn =  document.getElementById('tracker-prev-turn');
        this.nextTurn =  document.getElementById('tracker-next-turn');
        this.current = 0;
        console.log(this.creatures);
    }

    init() {
        this.sort()
        var that = this;
        this.formNew.addEventListener("submit", function(evt) {
            evt.preventDefault();
            // code from https://stackoverflow.com/questions/23139876/getting-all-form-values-by-javascript
            var submittedData = Object.fromEntries(new FormData(evt.target));
            console.log(submittedData);
            var creatureNew = that.mapArrayToCreature(submittedData);
            that.addCreature(creatureNew);
        });

        this.formEdit.addEventListener("submit", function(evt) {
            evt.preventDefault();
            var submittedData = Object.fromEntries(new FormData(evt.target));
            console.log(submittedData);
            var index = submittedData['index'];
            var creatureNew = that.mapArrayToCreature(submittedData);
            that.editCreature(creatureNew, index);
            that.clearEditForm();
        });

        this.nextTurn.addEventListener("click", function(e) {
            that.incrementTurn();
        });

        this.prevTurn.addEventListener("click", function(e) {
            that.decrementTurn();
        });
        
        document.addEventListener("click", function(e){
            if(e.target.className == 'creature__edit' ) {
                that.fillEditForm(e.target.getAttribute("data-index"));
            };
        });

        this.initKeys();

        this.render()
    }

    update() {
        this.el.innerHTML = '';
        this.render();
        console.log(this.creatures);
    }

    render() {
        for (var i = 0; i <= this.creatures.length-1; i++) {
            var creature = this.creatures[i];
            var li = this.generateHtmlForCreature(creature, i);
            this.el.appendChild(li);
        }
    }

    generateHtmlForCreature(creature, index) {
        var li = document.createElement('li');
        var hp = (creature.isPlayer)? creature.hpMax - creature.damaged : creature.damaged;
        var ac = (creature.isPlayer)? creature.ac : '';
        li.innerHTML = 
        '<div class="creature" data-current="' + creature.current + '">' + 
            '<div class="creature__initiative">' + creature.initiative + '</div>' +
            '<div class="creature__name">' + creature.name + '</div>' +
            '<div class="creature__hp">' + hp + '</div>' +
            '<div class="creature__ac">' + ac + '</div>' +
            '<div class="creature__buttons">' + 
                '<button class="creature__edit" data-index="' + index + '">edit</button>' + 
            '</div>' +
        '</div>'
        return li;
    }

    sort() {
        this.creatures.sort(function (a, b) {
            return a.initiative - b.initiative;
        });
    }

    mapArrayToCreature(array){
        var name = array['name'];
        var hpMax = parseInt(array['hpMax']);
        var damaged = parseInt(array['damaged']);
        var ac = parseInt(array['ac']);
        var initiative = parseInt(array['initiative']);
        var current = (array['current'].toLowerCase() === 'true');
        
        var isPlayer = (array['isPlayer'])? (array['isPlayer'].toLowerCase() === 'true') : false;

        var creature = new Creature(name, ac, hpMax, initiative);
        creature.setIsPlayer(isPlayer);
        creature.setIsCurrent(current);
        creature.setDamaged(damaged);
        return creature;
    }

    addCreature(creature){
        this.creatures.push(creature.json());
        this.sort();
        this.update();
    }

    editCreature(creature, index){
        this.creatures[index] = creature.json();
        this.sort();
        this.update();
    }

    fillEditForm(index) {
        console.log('editCreature:')
        var creature = this.creatures[index];
        console.log(creature);

        this.formEdit.elements["index"].value = index;
        this.formEdit.elements["initiative"].value = creature.initiative;
        this.formEdit.elements["name"].value = creature.name;
        this.formEdit.elements["hpMax"].value = creature.hpMax;
        this.formEdit.elements["damaged"].value = creature.damaged;
        this.formEdit.elements["ac"].value = creature.ac;
        this.formEdit.elements["isPlayer"].checked = creature.isPlayer;
        this.formEdit.elements["current"].value = creature.current;
    }

    clearEditForm(){
        this.formEdit.elements["index"].value = '';
        this.formEdit.elements["initiative"].value = '';
        this.formEdit.elements["name"].value = '';
        this.formEdit.elements["hpMax"].value = '';
        this.formEdit.elements["damaged"].value = '';
        this.formEdit.elements["ac"].value = '';
        this.formEdit.elements["isPlayer"].checked = false;
        this.formEdit.elements["current"].value = false;
    }

    getIndexOfCurrentCreature(){
        var index = this.creatures.findIndex(function (creature) {
            return creature.current === true;
        });
        if(index === -1) return 0;
        return index;
    }

    incrementTurn(){
        var index = this.getIndexOfCurrentCreature();
        this.creatures[index].current = false;
        if(++index >= this.creatures.length) {
            index = 0;
        }
        this.creatures[index].current = true;
        this.update();
    }

    decrementTurn(){
        var index = this.getIndexOfCurrentCreature();
        this.creatures[index].current = false;
        if(--index < 0) {
            index = this.creatures.length - 1;
        }
        this.creatures[index].current = true;
        this.update();
    }

    initKeys(){
        var that = this;
        document.addEventListener("keydown", function(e){
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                that.incrementTurn();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                that.decrementTurn();
            }
        });
    }

    /*
    templateForLi(){
        var html = 
        '<div class="creature">' + 
            '<div class="creature__initiative">%s</div>' +
            '<div class="creature__name">%s</div>' +
            '<div class="creature__hp">%s</div>' +
            '<div class="creature__hp">%s</div>' +
        '</div>'
    }
    */
}

class Creature {
    constructor(name, ac, hpMax, initiative) {
        this.name = name;
        this.ac = ac;
        this.damaged = 0
        this.hpMax = hpMax;
        this.initiative = initiative;
        this.isPlayer = false,
        this.current = false
    }

    setIsPlayer(isPlayer) {
        this.isPlayer = isPlayer;
    }

    setIsCurrent(current) {
        this.current = current;
    }

    setDamaged(damaged) {
        this.damaged = damaged;
    }

    json() {
        return {
            "name": this.name,
            "hpMax": this.hpMax,
            "damaged": this.damaged,
            "ac": this.ac,
            "isPlayer": this.isPlayer,
            "initiative": this.initiative,
            "current": this.current
        }
    }
}