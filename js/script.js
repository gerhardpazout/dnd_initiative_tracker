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
        this.saveButton =  document.getElementById('tracker-save');
        this.loadButton =  document.getElementById('tracker-load');
        this.editModal = new bootstrap.Modal(document.getElementById('edit-creature-modal'), {})
        this.current = 0;
        console.log(this.creatures);
    }

    init() {
        this.sendFlashMessage("File loaded successfully!", "Loading from file", SEVERITIES.SUCCESS);
        this.sort()
        var that = this;

        // Process 'new' form
        this.formNew.addEventListener("submit", function(evt) {
            evt.preventDefault();
            // code from https://stackoverflow.com/questions/23139876/getting-all-form-values-by-javascript
            var submittedData = Object.fromEntries(new FormData(evt.target));
            console.log(submittedData);
            var creatureNew = that.mapArrayToCreature(submittedData);
            that.addCreature(creatureNew);
        });

        // Process 'edit' form
        this.formEdit.addEventListener("submit", function(evt) {
            evt.preventDefault();

            // code from https://stackoverflow.com/questions/15495820/identify-the-value-of-clicked-submit-button-with-multiple-submit-buttons
            var action = evt.submitter.value;
            var submittedData = Object.fromEntries(new FormData(evt.target));
            var index = submittedData['index'];
            if(index !== '') {
                var creatureNew = that.mapArrayToCreature(submittedData); // build updated creature from submitted data

                console.log(submittedData);
                switch(action) {
                    case "save":
                        that.editCreature(creatureNew, index); // override creature in this.creatures
                        that.editModal.hide();
                        break;
                    case "delete":
                        that.deleteCreature(index);
                        that.editModal.hide();
                        break;
                }
            }
            
            that.clearEditForm();
        });

        // Next turn
        this.nextTurn.addEventListener("click", function(e) {
            that.incrementTurn();
        });

        // Previous turn
        this.prevTurn.addEventListener("click", function(e) {
            that.decrementTurn();
        });
        
        // Button for editing creature (fill 'edit' form)
        document.addEventListener("click", function(e){
            if(e.target.className.includes('creature__edit') ) {
                that.fillEditForm(e.target.getAttribute("data-index"));
                that.editModal.show();
            };
        });

        // save button
        this.saveButton.addEventListener("click", function(e) {
            that.save();
        });

         // load button
         this.loadButton.addEventListener("click", function(e) {
            that.load();
        });

        // initialize listeners for keyboard events
        this.initKeys();

        // render the list of creatures
        this.render();
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
        // var hp = (creature.isPlayer)? creature.hpMax - creature.damaged : creature.damaged;
        // var hp = (creature.isPlayer)? creature.hp : creature.hp;
        // var hpMax = (creature.isPlayer)? creature.hpMax : '';
        var hpMax = (creature.isPlayer && !isNaN(creature.hpMax))? creature.hpMax : '?';
        var hp = (isNaN(creature.hp) || creature.hp === null)? 0 : creature.hp;
        var hpDisplay = (creature.isPlayer)? '' + hp + '/' + hpMax : hp;
        var ac = (creature.isPlayer)? creature.ac : '';
        li.innerHTML = 
        '<div class="creature row" data-current="' + creature.current + '">' + 
            '<div class="creature__initiative col-1">' + creature.initiative + '</div>' +
            '<div class="creature__name col-3">' + creature.name + '</div>' +
            '<div class="creature__hp col-2">' + hpDisplay + '</div>' +
            '<div class="creature__ac col-1">' + ac + '</div>' +
            '<div class="creature__buttons offset-2 col-3">' + 
                '<button class="creature__edit btn btn-outline-light" data-index="' + index + '">' + 
                    'edit' + 
                '</button>' + 
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
        var hp = parseInt(array['hp']);
        var hpMax = parseInt(array['hpMax']);
        var damaged = parseInt(array['damaged']);
        var ac = parseInt(array['ac']);
        var initiative = parseInt(array['initiative']);
        var current = (array['current'].toLowerCase() === 'true');
        
        var isPlayer = (array['isPlayer'])? (array['isPlayer'].toLowerCase() === 'true') : false;

        var creature = new Creature(name, ac, hp, hpMax, initiative);
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

    deleteCreature(index) {
        console.log("deleteCreature(" + index + ")");
        // to get removed item just add "var removed = " at beginning of next line.
        this.creatures.splice(index, 1);
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
        this.formEdit.elements["hp"].value = creature.hp;
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
        this.formEdit.elements["hp"].value = '';
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

    save() {
        console.log("saving creatures to local storage...");
        localStorage.setItem("creatures", JSON.stringify(this.creatures));
        this.sendFlashMessage("Saved successfully to local storage!", "Saving to local storage", SEVERITIES.SUCCESS);
    }

    load() {
        console.log("loading creatures from local storage...");
        this.creatures = JSON.parse(localStorage.getItem("creatures"));
        this.sendFlashMessage("Loaded successfully from local storage!", "Loading from local storage", SEVERITIES.SUCCESS);
        this.update();
    }

    sendFlashMessage(message, header = '', severity = SEVERITIES.INFO) {
        var flashMessage = new FlashMessage(message, header, severity);
        var flashMessagesContainer = document.getElementById("flash-messages");
        flashMessagesContainer.appendChild(flashMessage.html());

        var flashMessages = flashMessagesContainer.children;
        console.log(flashMessages);
        const intervalID = setInterval(function (){
            for (let i = 0; i < flashMessages.length; i++) {
                if(!flashMessages[i].classList.contains("fade")){
                    flashMessages[i].classList.add('fade');
                }
            }
            clearInterval(intervalID);
        }, 4000, flashMessage);

        
        /*
        var flashMessages = flashMessagesContainer.children;
        const intervalID = setInterval(function (){
            // flashMessagesContainer
            for (let i = 0; i < flashMessages.length; i++) {
                if(flashMessages[i].classList.contains("fade")){
                    flashMessages[i].classList.add('hidden');
                }
                else {
                    flashMessages[i].classList.contains("fade")
                }
            }

            clearInterval(intervalID);
        }, 500, flashMessage);
        */
    }
}

class Creature {
    constructor(name, ac, hp, hpMax, initiative) {
        this.name = name;
        this.ac = ac;
        this.damaged = 0; // deprecated field, TODO: remove
        this.hp = hp;
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
            "hp": this.hp,
            "hpMax": this.hpMax,
            "damaged": this.damaged,
            "ac": this.ac,
            "isPlayer": this.isPlayer,
            "initiative": this.initiative,
            "current": this.current
        }
    }
}

const SEVERITIES = {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error"
};

class FlashMessage {

    constructor(message, header, severity) {
        this.message = message
        this.header = header
        this.severity = severity
        this.SEVERITIES = SEVERITIES;
    }

    html() {
        var htmlHeader = (this.header)?  '<h4 class="alert-heading">' + this.header + '</h4>': '';
        var div = document.createElement('div');
        var severityClass = 'alert-' + ((this.severity)? this.severity : this.SEVERITIES.INFO);
        div.classList.add('alert', 'alert-dismissible');
        div.classList.add(severityClass);
        div.setAttribute("role", "alert");
        div.innerHTML =  
            '<div class="alert-content">' + 
                htmlHeader + 
                '<p>' + this.message + '</p>' + 
            '</div>' + 
            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>'
        ;
        return div;
    }


}