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

        this.nextTurn.addEventListener("click", function(e) {
            console.log("next clicked!");
            console.log(that.incrementTurn());
        });

        this.prevTurn.addEventListener("click", function(e) {
            console.log("prev clicked!");
            console.log(that.decrementTurn());
        });

        this.render()
    }

    update() {
        console.log("updating CreatureList");
        this.el.innerHTML = '';
        this.render();
    }

    render() {
        console.log("CreatureList::render()");
        console.log(this.el);
        for (var i = 0; i <= this.creatures.length-1; i++) {
            var creature = this.creatures[i];
            var li = this.generateHtmlForCreature(creature);
            this.el.appendChild(li);
        }
    }

    generateHtmlForCreature(creature) {
        var li = document.createElement('li');
        var hp = (creature.isPlayer)? creature.hpMax - creature.damaged : creature.damaged;
        var ac = (creature.isPlayer)? creature.ac : '';
        li.innerHTML = 
        '<div class="creature" data-current="' + creature.current + '">' + 
            '<div class="creature__initiative">' + creature.initiative + '</div>' +
            '<div class="creature__name">' + creature.name + '</div>' +
            '<div class="creature__hp">' + hp + '</div>' +
            '<div class="creature__hp">' + ac + '</div>' +
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
        var ac = parseInt(array['ac']);
        var initiative = parseInt(array['initiative']);
        var current = false

        return new Creature(name, ac, hpMax, initiative);
    }

    addCreature(creature){
        this.creatures.push(creature.json());
        this.sort();
        console.log(this.creatures);
        this.update();
    }

    getIndexOfCurrentCreature(){
        var index = this.creatures.findIndex(function (creature) {
            return creature.current === true;
        });

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