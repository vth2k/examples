'use strict';

document.addEventListener('click', clickEventListener);
document.addEventListener('change', changeEventListener);

function clickEventListener(event) {
    let modal = new modalWindow(event);

    if (modal.getEventType() === 'control') {
        let handler = new ButtonsClickHandler(modal.returnEventAction());

        handler.showAction();
        handler.handle();
    }
    if (!modal.isModal()) {
        modal.toggle();
    }
}

function changeEventListener(event) {
    let changedNode = event.target.name;

    if (changedNode === 'file') {
        let handler = new ButtonsClickHandler(changedNode);
        handler.handle();
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
        return 'library/api/';
    }
}

class StaticFormMethods {
    static get itemName() {
        return document.forms[0].add.value;
    }

    static set itemName(value) {
        document.forms[0].add.value = value;
    }

    static get itemType() {
        return document.forms[0].type.value;
    }

    static set itemType(value) {
        document.forms[0].type.value = value;
    }

    static get fileSelect() {
        return document.forms[0].file.files;
    }

    static set fileSelect(value) {
        document.forms[0].file.value = value;
    }

    static getType() {
        return this.fileSelect.length > 0 ? CONSTANTS.FILE : CONSTANTS.FOLDER;
    }

    static setAsFile() {
        this.itemName = this.composeFileNames(document.forms[0].file);
        this.itemType = CONSTANTS.FILE;
    }

    static composeFileNames(formFileElement) {
        return [].map.call(formFileElement.files, file => file.name).join(CONSTANTS.SPLITTER);
    }
}

class StaticPrepareRequestMethods {
    static createFormDataFromFiles(fileNode) {
        let formData = new FormData();

        for (let i = 0; i < fileNode.files.length; i++) {
            formData.append(`file${i}`, fileNode.files[i]);
        }
        return formData;
    }

    static setGetParameters(parameters) {
        let isGet = false
            , requestParameters = {}
            , requestController;

        if (parameters.hasOwnProperty('itemName')) {
            if (parameters.itemName === '') {
                requestParameters.action = 'list';
                requestParameters.fileName = parameters.itemName;
                requestController = 'getJsonList';
            } else {
                requestParameters.action = 'book';
                requestParameters.fileName = parameters.itemName;
                requestController = 'getJsonBook';
            }
            isGet = true;
            requestParameters.path = parameters.path;
        }
        return {isGet: isGet, parameters: requestParameters, url: requestController};
    }

    static setEditParameters(parameters) {
        let errorMessage = `Error. `;
        let isEdit = false
            , withFile = false
            , requestParameters = {}
            , requestController = 'editList';

        if (parameters.hasOwnProperty('actionType')) {
            switch (parameters.actionType) {
                case 'add':
                    if (parameters.itemType === 'file') {
                        if (parameters.itemName === '') {
                            throw new Error(errorMessage + 'Can not add file without the name.')
                        } else {
                            withFile = true;
                        }
                    }
                    break;
                case 'remove':
                    if (parameters.itemName === '') {
                        throw new Error(errorMessage + ' Nothing to remove.');
                    }
                    break;
            }
            isEdit = true;
            requestParameters.objectName = parameters.itemName;
            requestParameters.objectType = parameters.itemType;
            requestParameters.action = parameters.actionType;
            requestParameters.path = parameters.path;
        }
        return {isEdit: isEdit, parameters: requestParameters, url: requestController, withFile: withFile};
    }
}

class ButtonsClickHandler {
    constructor(action) {
        this.action = action;
        this.value = '';
        this.type = CONSTANTS.FOLDER;
    }

    showAction() {
        console.log(this.action);
    }

    handle() {
        let request;

        switch (this.action) {
            case 'add':
                this.value = StaticFormMethods.itemName;
                this.type = StaticFormMethods.getType();

                if (this._notEmpty()) {
                    let editCallParameters = {
                        actionType: 'add',
                        itemName: this.value,
                        itemType: this.type
                    };
                    let requestBody = new RequestProcessor();
                    request = requestBody.prepare('edit', '', editCallParameters);
                }
                break;
            case 'clear':
                this._clearToDefault();
                break;
            case 'file':
                StaticFormMethods.setAsFile();
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
                    });
                }
                break;
        }

        if (typeof request === 'object') {
            fetch(request)
                .then(function (response) {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Network response is bad.');
                })
                .then(function (data) {
                    console.log(data);
                    return (data);
                })
                .catch(function (error) {
                    console.log(error);
                })
        }
    }

    _notEmpty() {
        return this.value !== '';
    }

    _clearToDefault() {
        this.value = '';
        StaticFormMethods.itemName = this.value;
        StaticFormMethods.fileSelect = this.value;
        StaticFormMethods.itemType = CONSTANTS.FOLDER;
    }

    _getRemoveParameters() {
        this.value = StaticFormMethods.itemName;
        this.type = StaticFormMethods.itemType;
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
                    break;
                case this.rolePointer:
                    this.targetIsModal = true;
                    return 'modal';
                    break;
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
    }

    prepare(action, path, others) {
        let requestParameters
            , errorMessage = `Incorrect parameters provided in ${action} request.`;

        switch (action) {
            case 'get':
                requestParameters = StaticPrepareRequestMethods.setGetParameters({
                    itemName: others.itemName,
                    path: path,
                });

                if (requestParameters.isGet) {
                    this.requestBody = requestParameters.parameters;
                    this.requestController = requestParameters.url;
                } else {
                    throw new Error(errorMessage);
                }
                break;
            case 'edit':
                requestParameters = StaticPrepareRequestMethods.setEditParameters({
                    actionType: others.actionType,
                    itemName: others.itemName,
                    itemType: others.itemType,
                    path: path,
                });

                if (requestParameters.isEdit) {
                    if (requestParameters.withFile) {
                        let formData = StaticPrepareRequestMethods.createFormDataFromFiles(document.forms[0].file);
                        requestParameters.parameters.objectName = requestParameters.parameters.objectName.split(CONSTANTS.SPLITTER);
                        formData.append('description', JSON.stringify(requestParameters.parameters));
                        this.requestBody = formData;
                        this.requestType = 'formData';
                    } else {
                        this.requestBody = requestParameters.parameters;
                    }
                    this.requestController = requestParameters.url;
                } else {
                    throw new Error(errorMessage);
                }
                break;
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
}
