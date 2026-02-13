/**
 * @fileoverview Utilidades de validación y notificaciones.
 * Envuelve SweetAlert2 para mostrar pop-ups consistentes (error, éxito, advertencia, info)
 * y valida los parámetros de creación de la estructura de datos.
 * @module utils/Validation
 */

/**
 * Módulo de validación y notificaciones visuales.
 * Usa SweetAlert2 para mostrar diálogos modales con estilos consistentes.
 * @namespace
 */
const Validation = {
    /**
     * Muestra un pop-up de error y limpia el input indicado.
     * @param {string} message - Mensaje de error a mostrar.
     * @param {HTMLInputElement|null} [inputElement=null] - Input a limpiar tras cerrar el diálogo.
     */
    showError(message, inputElement = null) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonColor: '#2B579A',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            if (inputElement) {
                inputElement.value = '';
                inputElement.focus();
            }
        });
    },

    /**
     * Muestra un pop-up de éxito con auto-cierre de 2 segundos.
     * @param {string} message - Mensaje de éxito a mostrar.
     */
    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: message,
            confirmButtonColor: '#217346',
            confirmButtonText: 'Aceptar',
            timer: 2000,
            timerProgressBar: true
        });
    },

    /**
     * Muestra un pop-up de advertencia.
     * @param {string} message - Mensaje de advertencia.
     */
    showWarning(message) {
        Swal.fire({
            icon: 'warning',
            title: 'Advertencia',
            text: message,
            confirmButtonColor: '#D83B01',
            confirmButtonText: 'Entendido'
        });
    },

    /**
     * Muestra un pop-up informativo.
     * @param {string} message - Mensaje informativo.
     */
    showInfo(message) {
        Swal.fire({
            icon: 'info',
            title: 'Información',
            text: message,
            confirmButtonColor: '#2B579A',
            confirmButtonText: 'Aceptar'
        });
    },

    /**
     * Muestra un diálogo de confirmación con botones Sí/Cancelar.
     * @param {string} message - Texto de la pregunta de confirmación.
     * @param {string} [title='¿Está seguro?'] - Título del diálogo.
     * @returns {Promise<boolean>} true si el usuario confirmó, false si canceló.
     */
    async confirm(message, title = '¿Está seguro?') {
        const result = await Swal.fire({
            icon: 'question',
            title: title,
            text: message,
            showCancelButton: true,
            confirmButtonColor: '#2B579A',
            cancelButtonColor: '#D83B01',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        });
        return result.isConfirmed;
    },

    /**
     * Valida los parámetros de creación de la estructura de datos.
     * Verifica que el tipo de dato, tamaño de clave y rango sean válidos.
     * @param {string} size - Rango de la estructura (texto del input).
     * @param {string} keyLength - Tamaño de la clave (texto del input).
     * @param {string} dataType - Tipo de dato seleccionado.
     * @returns {{valid: boolean, error: string|null}}
     */
    validateCreateParams(size, keyLength, dataType) {
        if (!dataType || dataType === '') {
            return { valid: false, error: 'Debe seleccionar un tipo de dato.' };
        }

        if (!keyLength || isNaN(keyLength) || parseInt(keyLength) <= 0) {
            return { valid: false, error: 'El tamaño de la clave debe ser un número entero positivo.' };
        }

        if (!size || isNaN(size) || parseInt(size) <= 0) {
            return { valid: false, error: 'El rango de la estructura debe ser un número entero positivo.' };
        }

        const sizeNum = parseInt(size);
        if (sizeNum > 1000000000) {
            return { valid: false, error: 'El rango máximo permitido es 1,000,000,000 (10⁹). Ingrese un valor menor.' };
        }

        return { valid: true, error: null };
    }
};
