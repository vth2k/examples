'use strict';

document.addEventListener('click', clickEventListener);
document.addEventListener('change', changeEventListener);

function clickEventListener(event) {
    let modal = new modalWindow(event);

    if (modal.getEventType() === 'control') {
        let handler = new ButtonsClickHandler(modal.returnEventAction())
            , form = new Form(event);

        handler.showAction();
        if (form.exists()) {
            handler.handle(form.formName);
        }
    }
    if (!modal.isModal()) {
        modal.toggle();
    }
}

function changeEventListener(event) {
    let changedNode = event.target.name;

    if (changedNode === 'file') {
        let handler = new ButtonsClickHandler(changedNode)
            , form = new Form(event);

        if (form.exists()) {
            handler.handle(form.formName);
        }
    }
}

class CONSTANTS {
    static get FOLDER() {
        return 'folder';
    }

    static get FILE() {
        return 'file';
    }

    static get SPLITTER() {
        return ', ';
    }

    static get BASEURL() {
        return 'http://192.168.10.235/up-concepta/web/app.php/library/api/';
    }
}

class Form {
    constructor(event) {
        let target = event.target;
        this.formNodeName = '';

        while (target.parentNode) {
            if (target.tagName === 'form'.toUpperCase()) {
                this.formNodeName = target.name;
                break;
            }
            target = target.parentNode;
        }
    }

    exists() {
        return this.formNodeName !== '';
    }

    get formName() {
        return this.formNodeName;
    }
}

class ButtonsClickHandler {
    constructor(action) {
        this.action = action;
        this.value = '';
        this.type = CONSTANTS.FOLDER;
        this.formName = '';
    }

    showAction() {
        console.log(this.action);
    }

    handle(formName = this.formName) {
        let request;
        this.formName = formName;

        switch (this.action) {
            case 'add':
                this.value = this._itemName;
                this.type = this._getType();
                console.log('value: ' + this.value);
                console.log('type: ' + this.type);
                if (this._notEmpty()) {
                    let editCallParameters = {
                        actionType: 'add',
                        itemName: this.value,
                        itemType: this.type
                    };
                    let requestBody = new RequestProcessor();
                    request = requestBody.prepare('edit', '', editCallParameters, this.formName);
                }
                break;
            case 'clear':
                this._clearToDefault();
                break;
            case 'file':
                this._setAsFile();
                break;
            case 'list':
                let requestBody = new RequestProcessor();
                request = requestBody.prepare('get', '', {itemName: ''});
                break;
            case 'remove':
                this._getRemoveParameters();
                if (this._notEmpty()) {
                    let requestBody = new RequestProcessor();
                    request = requestBody.prepare('edit', '', {
                        actionType: 'remove',
                        itemName: this.value,
                        itemType: this.type
                    }, this.formName);
                }
        }

        if (typeof request === 'object') {
            fetch(request)
                .then(this._checkResponse)
                .then(this._showData)
                .catch(this._showError);
        }
    }

    _checkResponse(response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Network response is bad.');
    }

    _showData(data) {
        console.log(data);
        return (data);
    }

    _showError(error) {
        console.log(error);
    }

    _notEmpty() {
        return this.value !== '';
    }

    _clearToDefault() {
        this.value = '';
        this._itemName = this.value;
        this._fileSelect = this.value;
        this._itemType = CONSTANTS.FOLDER;
    }

    _getRemoveParameters() {
        this.value = this._itemName;
        this.type = this._itemType;
    }

    get _itemName() {
        return document[this.formName].add.value;
    }

    set _itemName(value) {
        document[this.formName].add.value = value;
    }

    get _itemType() {
        return document[this.formName].type.value;
    }

    set _itemType(value) {
        document[this.formName].type.value = value;
    }

    get _fileSelect() {
        return document[this.formName].file.files;
    }

    set _fileSelect(value) {
        document[this.formName].file.value = value;
    }

    _composeFileNames() {
        return [].map.call(document[this.formName].file.files, file => file.name).join(CONSTANTS.SPLITTER);
    }

    _setAsFile() {
        this._itemName = this._composeFileNames();
        this._itemType = CONSTANTS.FILE;
    }

    _getType() {
        return this._fileSelect.length > 0 ? CONSTANTS.FILE : CONSTANTS.FOLDER;
    }
}

class modalWindow {
    constructor(event, modalPointer = 'modal', modalControllerPointer = 'button') {
        this.targetIsModal = false;
        this.target = event.target;
        this.currentTarget = event.currentTarget;
        this.rolePointer = modalPointer;
        this.controllerPointer = modalControllerPointer;
        this.controlAction = 'none';
    }

    getEventType() {
        while (this.target !== this.currentTarget) {
            switch (this.target.dataset.role) {
                case this.controllerPointer:
                    this.targetIsModal = true;
                    this.controlAction = this.target.dataset.action;
                    return 'control';
                case this.rolePointer:
                    this.targetIsModal = true;
                    return 'modal';
                default:
                    this.target = this.target.parentNode;
            }
        }
        return 'none';
    }

    returnEventAction() {
        return this.controlAction;
    }

    isModal() {
        return this.targetIsModal;
    }

    _getModalNode() {
        return document.querySelector('[data-role="' + this.rolePointer + '"]')
    }

    toggle() {
        this._isDisplayed() ? this._hideModal() : this._showModal();
    }

    _isDisplayed() {
        return this._getModalNode().style.display !== 'none';
    }

    _hideModal() {
        this._getModalNode().style.display = 'none';
    }

    _showModal() {
        this._getModalNode().style.display = 'flex';
    }
}

class RequestProcessor {
    constructor() {
        this.requestType = 'json';
        this.requestBody = '';
        this.requestController = '';
        this.setParameters = {};
        this.formPointer = '';
    }

    prepare(action, path, others, formPointer = '') {
        let requestParameters
            , errorMessage = `Incorrect parameters provided in ${action} request.`;
        this.formPointer = formPointer;

        switch (action) {
            case 'get':
                this.setParameters = {
                    itemName: others.itemName,
                    path: path,
                };
                requestParameters = this._setGetParameters();

                if (requestParameters.isGet) {
                    this.requestBody = requestParameters.parameters;
                    this.requestController = requestParameters.url;
                } else {
                    throw new Error(errorMessage);
                }
                break;
            case 'edit':
                this.setParameters = {
                    actionType: others.actionType,
                    itemName: others.itemName,
                    itemType: others.itemType,
                    path: path,
                };
                requestParameters = this._setEditParameters();

                if (requestParameters.isEdit) {
                    if (requestParameters.withFile) {
                        if (this._formPointerNotEmpty()) {
                            let formData = this._createFormDataFromFiles('file');
                            requestParameters.parameters.objectName = requestParameters.parameters.objectName.split(CONSTANTS.SPLITTER);
                            formData.append('description', JSON.stringify(requestParameters.parameters));
                            this.requestBody = formData;
                            this.requestType = 'formData';
                        } else {
                            throw new Error(errorMessage);
                        }
                    } else {
                        this.requestBody = requestParameters.parameters;
                    }
                    this.requestController = requestParameters.url;
                } else {
                    throw new Error(errorMessage);
                }
        }
        return this._makeRequest();
    }

    _makeRequest() {
        let requestParameters = {
            method: 'POST',
            mode: 'cors',
        };

        if (this.requestType === 'json') {
            requestParameters.headers = {
                'Content-Type': 'application/json'
            };
            requestParameters.body = JSON.stringify(this.requestBody);
        } else {
            requestParameters.body = this.requestBody;
        }
        return new Request(CONSTANTS.BASEURL + this.requestController, requestParameters);
    }

    _formPointerNotEmpty() {
        return this.formPointer !== '';
    }

    _createFormDataFromFiles(fileNode) {
        let formData = new FormData();

        for (let i = 0; i < document[this.formPointer][fileNode].files.length; i++) {
            formData.append(`file${i}`, document[this.formPointer][fileNode].files[i]);
        }
        return formData;
    }

    _setGetParameters() {
        let isGet = false
            , requestParameters = {}
            , requestController;

        if (this.setParameters.hasOwnProperty('itemName')) {
            if (this.setParameters.itemName === '') {
                requestParameters.action = 'list';
                requestParameters.fileName = this.setParameters.itemName;
                requestController = 'getJsonList';
            } else {
                requestParameters.action = 'book';
                requestParameters.fileName = this.setParameters.itemName;
                requestController = 'getJsonBook';
            }
            isGet = true;
            requestParameters.path = this.setParameters.path;
        }
        return {isGet: isGet, parameters: requestParameters, url: requestController};
    }

    _setEditParameters() {
        let errorMessage = `Error. `;
        let isEdit = false
            , withFile = false
            , requestParameters = {}
            , requestController = 'editList';

        if (this.setParameters.hasOwnProperty('actionType')) {
            switch (this.setParameters.actionType) {
                case 'add':
                    if (this.setParameters.itemType === 'file') {
                        if (this.setParameters.itemName === '') {
                            throw new Error(errorMessage + 'Can not add file without the name.')
                        } else {
                            withFile = true;
                        }
                    }
                    break;
                case 'remove':
                    if (this.setParameters.itemName === '') {
                        throw new Error(errorMessage + ' Nothing to remove.');
                    }
            }
            isEdit = true;
            requestParameters.objectName = this.setParameters.itemName;
            requestParameters.objectType = this.setParameters.itemType;
            requestParameters.action = this.setParameters.actionType;
            requestParameters.path = this.setParameters.path;
        }
        return {isEdit: isEdit, parameters: requestParameters, url: requestController, withFile: withFile};
    }
}