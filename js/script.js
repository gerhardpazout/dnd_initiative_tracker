document.addEventListener('DOMContentLoaded', function () {

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

const SEVERITIES = {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "danger"
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

class FlashMessageService {
    constructor() {
        this.fadeTime = 6000;
        this.SEVERITIES = SEVERITIES;
    }

    sendFlashMessage(message, header = '', severity = SEVERITIES.INFO) {
        var flashMessage = new FlashMessage(message, header, severity);
        var flashMessagesContainer = document.getElementById("flash-messages");
        flashMessagesContainer.appendChild(flashMessage.html());

        var flashMessages = flashMessagesContainer.children;
        const intervalID = setInterval(function (){
            for (let i = 0; i < flashMessages.length; i++) {
                if(!flashMessages[i].classList.contains("fade")){
                    flashMessages[i].classList.add('fade');
                }
            }
            clearInterval(intervalID);
        }, this.fadeTime, flashMessage);
    }
}

class FileHandler2 {
    constructor() {
        this.file = document.querySelector("input[type=file]").files[0];
        this.reader = new FileReader();
        this.content = '';
        this.json = '';
        this.flashMessageService = new FlashMessageService();
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
        switch(this.file.type) {
            case "application/json":
                this.parseJSON();
                break;
            default:
                this.sendFlashMessage('File must be JSON file! No other files allowed!', 'Error while importing!', this.flashMessageService.SEVERITIES.ERROR);
                break;
        }
    }

    parseJSON() {  
        this.json = JSON.parse(this.content);
    }

    sendFlashMessage(message, header = '', severity = SEVERITIES.INFO) {
        this.flashMessageService.sendFlashMessage(message, header, severity);
    }
}

class CreatureList {
    constructor(json = '') {
        this.data = {};
        this.data.creatures = this.jsonArrayToObjects(json.creatures);
        this.data.round = 1;
        this.elements = {
            round: document.getElementById('round-count')
        }
        this.el = document.getElementById('creature-list');
        this.formNew = document.getElementById('form-creature-new');
        this.formEdit = document.getElementById('form-creature-edit');
        this.prevTurn =  document.getElementById('tracker-prev-turn');
        this.nextTurn =  document.getElementById('tracker-next-turn');
        this.saveButton =  document.getElementById('tracker-save');
        this.loadButton =  document.getElementById('tracker-load');
        this.fileUploadField = document.getElementById('json-file');
        this.editModal = new bootstrap.Modal(document.getElementById('edit-creature-modal'), {})
        this.current = 0;
        this.flashMessageService = new FlashMessageService();
        this.dragAndDrop = { "pointerStartX" : null, "pointerStartY" : null, "element" : null, "dragging": false };
    }

    init() {
        this.sendFlashMessage("Initiating Creature List...", "", SEVERITIES.SUCCESS);
        this.sort()
        var that = this;

        // Process 'new' form
        this.formNew.addEventListener("submit", function(evt) {
            evt.preventDefault();
            // code from https://stackoverflow.com/questions/23139876/getting-all-form-values-by-javascript
            var submittedData = Object.fromEntries(new FormData(evt.target));
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

                switch(action) {
                    case "save":
                        that.editCreature(creatureNew, index); // override creature in this.data.creatures
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

        document.addEventListener("mousedown", function(e){
            if(e.target.className.includes('creature__drag-and-drop') || e.target.className.includes('creature__drag-and-drop-label')) {
                that.dragCreature(e.target.getAttribute("data-index"));

                document.addEventListener("mousemove", function(e){
                    if(e.target.className.includes('creature__drag-and-drop') || e.target.className.includes('creature__drag-and-drop-label')) {
                        that.moveCreature(e.target.getAttribute("data-index"), e);
                    }
                });
            }
        });

        document.addEventListener("mouseup", function(e){
            if(e.target.className.includes('creature__drag-and-drop') || e.target.className.includes('creature__drag-and-drop-label')) {
                that.dropCreature(e.target.getAttribute("data-index"));
            }
        });

        // save button
        this.saveButton.addEventListener("click", function(e) {
            that.save();
        });

        // load button
        this.loadButton.addEventListener("click", function(e) {
            that.load();
            that.clearFileUploadField();
        });

        // initialize listeners for keyboard events
        this.initKeys();

        // render the list of creatures
        this.render();

        this.sendFlashMessage("Finished initiating creature list!", "", SEVERITIES.SUCCESS);
    }

    jsonArrayToObjects(jsonArray) {
        var objects = [];
        if(!jsonArray || jsonArray.length <= 0) {
            return objects;
        }
        for(var i = 0; i < jsonArray.length; i++) {
            var object = Creature.generateFromJson(jsonArray[i]);
            objects.push(object);
        }
        return objects;
    }

    update() {
        this.elements.round.innerHTML = this.data.round;
        this.el.innerHTML = '';
        console.log(this.data.creatures);
        this.render();
    }

    render() {
        if(Array.isArray(this.data.creatures) && this.data.creatures.length > 0) {
            for (var i = 0; i <= this.data.creatures.length-1; i++) {
                var creature = this.data.creatures[i];
                var li = this.generateHtmlForCreature(creature, i);
                this.el.appendChild(li);
            }
        }
    }

    setCreaturesFromJson(json) {
        if(typeof json.creatures !== 'undefined' && json.creatures !== null && json.creatures !== '') {
            this.data = json;
            this.data.creatures = this.jsonArrayToObjects(json.creatures);
            this.sort();
            this.update();
            this.sendFlashMessage('Creatures imported from JSON!', 'Import success!', SEVERITIES.SUCCESS);
        }
        else {
            this.sendFlashMessage('No creatures found in provided File!', 'Error while importing!', SEVERITIES.ERROR);
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
        var conditions = (creature.conditions)? creature.conditionsToString() : '';

        li.innerHTML = 
        '<div class="creature row" data-current="' + creature.current + '">' + 
            '<div class="creature__initiative col-1">' + creature.initiative + '</div>' +
            '<div class="creature__name col-3">' + creature.name + '</div>' +
            '<div class="creature__hp col-2">' + hpDisplay + '</div>' +
            '<div class="creature__ac col-1">' + ac + '</div>' +
            '<div class="creature__conditions col-2">' + conditions + '</div>' +
            '<div class="creature__buttons col-2">' + 
                '<button class="creature__edit btn btn-outline-light" data-index="' + index + '">' + 
                    'edit' + 
                '</button>' + 
            '</div>' +
            '<div class="creature__buttons col-1">' + 
                '<button class="btn btn-link creature__drag-and-drop w-100" data-index="' + index + '" tabindex="-1">' + 
                    '<span class="creature__drag-and-drop-label" aria-hidden="true" data-index="' + index + '">⠿</span>' + 
                '</button>' +
            '</div>' +
        '</div>'
        return li;
    }

    sort() {
        if(typeof this.data.creatures !== 'undefined') {
            this.data.creatures.sort(function (a, b) {
                return b.initiative - a.initiative;
            });
        }
    }

    sortManually(indexDragging, indexOverlapping) {
        if (indexOverlapping !== null) {
            var creatureDragging = this.data.creatures[indexDragging];
            var creatureOverlapping = this.data.creatures[indexOverlapping];

            if(indexDragging < indexOverlapping) {
                var newInitiative = creatureOverlapping.initiative;
                creatureDragging.initiative = newInitiative;

                console.log(this.data.creatures);
                this.data.creatures.splice(indexDragging, 1);
                console.log(this.data.creatures.slice(0));
                this.data.creatures.splice(Math.max(0, indexOverlapping-1), 0, creatureDragging);
                console.log(this.data.creatures.slice(0));
            }
            else {
                var newInitiative = creatureOverlapping.initiative;
                creatureDragging.initiative = newInitiative;
                this.data.creatures.splice(indexDragging, 1);
                this.data.creatures.splice(Math.max(0, indexOverlapping), 0, creatureDragging);
            }
        }

        this.update();
    }

    dragCreature(index) {
        // console.log('dragCreature()');
        var creature = this.data.creatures[index];
        console.log(creature);
        var creatureDOM = this.getDOMCreature(index);
        // this.dragAndDrop['element'] = index;
        this.dragAndDrop['element'] = index;
        var originalWidth = creatureDOM.getBoundingClientRect().width;
        creatureDOM.style.width = originalWidth + "px";
        creatureDOM.classList.add('dragging');
    }

    dropCreature(index) {
        // console.log('dropCreature()');
        
        var creatureDOM = this.getDOMCreature(index);

        var overlappingDomElement = this.getOverlappingDomElement(parseInt(index), creatureDOM);
        this.sortManually(parseInt(index), overlappingDomElement);

        this.dragAndDrop['element'] = null;
        this.dragAndDrop['dragging'] = false;
        this.dragAndDrop['pointerStartY'] = null;
        creatureDOM.classList.remove('dragging');
        creatureDOM.style.top = 'unset';

        /*
        var creature = this.data.creatures[index];
        var creatureDOM = this.getDOMCreature(index);
        creatureDOM.classList.remove('dragging');
        */
    }

    moveCreature(index, e) {
        if(!this.dragAndDrop['element']) return;
        if (index === this.dragAndDrop['element']) {
            this.dragAndDrop['dragging'] = true;
            // console.log('ELEMENT' + index + ' IS BEING DRAGGED!');
            
            // this.dragAndDrop['element'] = index;
            //this.dragAndDrop['dragging'] = true;

            var cursorY = e.pageY;
            var cursorX = e.pageX;
            var creatureDOM = this.getDOMCreature(index);
            var creatureY = creatureDOM.getBoundingClientRect().top;
            var creatureX = creatureDOM.getBoundingClientRect().left;
            var creatureHeight = creatureDOM.getBoundingClientRect().height;
            var listY = this.el.getBoundingClientRect().top;

            if(!this.dragAndDrop['pointerStartY']) {
                this.dragAndDrop['pointerStartY'] = parseInt(cursorY);
            }

            var deltaYCursor =  cursorY - this.dragAndDrop['pointerStartY'];
            // console.log('deltaY: ' + deltaYCursor);

            // creatureDOM.style.top = (creatureY + deltaYCursor) - listY + 'px';
            creatureDOM.style.top = cursorY - listY - (creatureHeight / 2) + 'px';

            var overlappingDomElement = this.getOverlappingDomElement(parseInt(index), creatureDOM);
            // this.addMarginToOverlappingDomElement(overlappingDomElement, creatureHeight);

            console.log('overlappingDomElement: ' + overlappingDomElement);
            /*
            console.log('========');
            console.log(creatureY);
            console.log(cursorY);
            console.log('========');
            */

            

        
            /*
            creatureDOM.style.top = cursorY + "px";
            creatureDOM.style.left = cursorX + "px";
            */
        }
    }

    getDOMCreature(index) {
        var createList = this.el;
        var creatureDOM = createList.children.item(index);
        return creatureDOM;
    }

    getOverlappingDomElement(indexOfcurrentChild, currentChild) {
        // console.log('getOverlappingDomElement() - indexOfcurrentChild: ' + indexOfcurrentChild );
        var children = this.el.children;
        var overlappingChild = null;
        for (var i = 0; i < children.length; i++) {
            if(i !== indexOfcurrentChild && this.areDomElementsOverlapping(currentChild, children[i])) {
                // console.log('CHILD: ' + i);
                overlappingChild = i;
            }
        }
        return overlappingChild;
    }

    areDomElementsOverlapping(element1, element2) {    
        const rect1 = element1.getBoundingClientRect(); 
        const rect2 = element2.getBoundingClientRect(); 
        
        if (!(rect1.right < rect2.left || 
            rect1.left > rect2.right ||  
            rect1.bottom < rect2.top ||  
            rect1.top > rect2.bottom)
        ) { 
            return true;
        } else { 
            return false;
        } 
    }

    clearStyleOfDomElements() {
        for (var i = 0; i < children.length; i++) {
            children[i].style.marginTop = null;
            children[i].style.marginBottom = null;
        }
    }

    /*
    addDropIndicators(index, draggingDomElement) {
        var html = document.createElement('div');
        html.classList.add('drop-indicator');
        html.style.height = draggingDomElement.getBoundingClientRect().height + 'px';
        this.el.children.item(index).classList.style.marginTop = margin + 'px';
    }
    */

    getCursorPosition() {
        
    }

    mapArrayToCreature(array){
        var name = array['name'];
        var hp = parseInt(array['hp']);
        var hpMax = parseInt(array['hpMax']);
        var damaged = parseInt(array['damaged']);
        var ac = parseInt(array['ac']);
        var initiative = parseInt(array['initiative']);
        var current = (array['current'].toLowerCase() === 'true');
        var conditions = (array['conditions'])? ConditionUtils.stringToJson(array['conditions']) : [];
        var isPlayer = (array['isPlayer'])? (array['isPlayer'].toLowerCase() === 'true') : false;

        var creature = new Creature(name, ac, hp, hpMax, initiative);
        creature.setIsPlayer(isPlayer);
        creature.setIsCurrent(current);
        creature.setDamaged(damaged);
        creature.setConditions(conditions);
        return creature;
    }

    addCreature(creature){
        this.data.creatures.push(creature);
        this.sort();
        this.update();
    }

    editCreature(creature, index){
        this.data.creatures[index] = creature;
        this.sort();
        this.update();
    }

    deleteCreature(index) {
        // to get removed item just add "var removed = " at beginning of next line.
        this.data.creatures.splice(index, 1);
        this.sort();
        this.update();
    }

    fillEditForm(index) {
        var creature = this.data.creatures[index];
        
        this.formEdit.elements["index"].value = index;
        this.formEdit.elements["initiative"].value = creature.initiative;
        this.formEdit.elements["name"].value = creature.name;
        this.formEdit.elements["hp"].value = creature.hp;
        this.formEdit.elements["hpMax"].value = creature.hpMax;
        this.formEdit.elements["damaged"].value = creature.damaged;
        this.formEdit.elements["ac"].value = creature.ac;
        this.formEdit.elements["isPlayer"].checked = creature.isPlayer;
        this.formEdit.elements["conditions"].value = creature.conditionsToString();
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
        this.formEdit.elements["conditions"].value = '';
        this.formEdit.elements["current"].value = false;
    }

    clearFileUploadField() {
        this.fileUploadField.value = "";
    }

    getIndexOfCurrentCreature(){
        var index = this.data.creatures.findIndex(function (creature) {
            return creature.current === true;
        });
        if(index === -1) return 0;
        return index;
    }

    incrementTurn(){
        var index = this.getIndexOfCurrentCreature();
        this.data.creatures[index].current = false;
        if(++index >= this.data.creatures.length) {
            index = 0;
            this.data.round++;
            for(var i = 0; i < this.data.creatures.length; i++) {
                // this.data.creatures[i].decrementConditions();
            }
        }
        this.data.creatures[index].current = true;
        this.data.creatures[index].decrementConditions();

        console.log("Round: " + this.data.round);
        this.update();
    }

    decrementTurn(){
        var index = this.getIndexOfCurrentCreature();
        this.data.creatures[index].current = false;
        if(--index < 0) {
            index = this.data.creatures.length - 1;
            this.data.round--;
            for(var i = 0; i < this.data.creatures.length; i++) {
                // this.data.creatures[i].incrementConditions();
            }
        }
        this.data.creatures[index].current = true;
        this.data.creatures[index].incrementConditions();
        console.log("Round: " + this.data.round);
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
        localStorage.setItem("dndTracker", JSON.stringify(this.data));
        this.sendFlashMessage("Saved successfully to local storage!", "Saving to local storage", SEVERITIES.SUCCESS);
    }

    load() {
        var rawData = JSON.parse(localStorage.getItem("dndTracker"));
        this.data = rawData;
        this.data.creatures = this.jsonArrayToObjects(rawData.creatures);
        this.sendFlashMessage("Loaded successfully from local storage!", "Loading from local storage", SEVERITIES.SUCCESS);
        this.update();
    }

    sendFlashMessage(message, header = '', severity = SEVERITIES.INFO) {
        this.flashMessageService.sendFlashMessage(message, header, severity);
    }
}

class ConditionUtils {
    static jsonToString(conditions) {
        var str = "";
        for(var i = 0; i < conditions.length; i++) {
            var condition = conditions[i];
            str += condition.name;
            if (condition.duration !== null) str += " (" + condition.duration + ")";
            if (i < conditions.length - 1) str += ", ";
        }
        return str;
    }

    static stringToJson(str) {
        if(!str || str === '') return [];
        // split comma separated string into array
        var conditionsRaw = str.split(',').map(function(item) {
            return item.trim();
        });
        var conditions = []; // array, will be filled with conditions as json {name, duration}
        for (var i = 0; i < conditionsRaw.length; i++) {
            var name = conditionsRaw[i];
            var duration = null;
            var hasDuration = (conditionsRaw[i].indexOf("(") > -1)? true : false;
            console.log(hasDuration);
            if(hasDuration) {
                name = conditionsRaw[i].substring(0, conditionsRaw[i].indexOf("(")).trim();
                duration = parseInt(conditionsRaw[i].substring(conditionsRaw[i].indexOf("(") + 1, conditionsRaw[i].indexOf(")")));
            }
            var condition = {"name" : name, "duration" : duration};
            conditions.push(condition);
        }
        return conditions;

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
        this.isPlayer = false;
        this.current = false;
        this.conditions = '';
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

    setConditions(conditions) {
        this.conditions = conditions;
    }

    decrementConditions() {
        var conditionsNew = [];
        for(var i = 0; i < this.conditions.length; i++) {
            if(this.conditions[i].duration !== null) this.conditions[i].duration--;
            if(this.conditions[i].duration == null || this.conditions[i].duration > 0) conditionsNew.push(this.conditions[i]);
        }
        this.conditions = conditionsNew;
    }
    /**
     * Basically just serves as a undo function for now.
     * A propper undo function will be added at some point, by which this method will be rendered obsolete.
     */
    incrementConditions() {
        for(var i = 0; i < this.conditions.length; i++) {
            if(this.conditions[i].duration !== null) this.conditions[i].duration++;
        }
    }

    conditionsToString() {
        return ConditionUtils.jsonToString(this.conditions);
    }

    static generateFromJson(json){
        var creature = new Creature(json.name, json.ac, json.hp, json.hpMax, json.initiative);
        creature.setIsPlayer(json.isPlayer);
        creature.setIsCurrent(json.current);
        creature.setConditions(json.conditions);
        return creature;
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
            "conditions": this.conditions,
            "current": this.current,
        }
    }
}

console.log('document ready!');

// instantiate & initialize CreatureList
const creatureList = new CreatureList('{}');
creatureList.init();

// add listener for importing creatures from JSON file
document.getElementById('json-file').addEventListener('input', () => {
    var fileHandler = new FileHandler2();
    fileHandler.init();
    
    setTimeout(function(){
        creatureList.setCreaturesFromJson(fileHandler.json);
    },500);
    
});

}, false);