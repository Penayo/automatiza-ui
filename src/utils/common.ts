import type { APIData, BaseService } from "@services/BaseService";
import type { ModelApiService } from "@services/ModelAPI";

export function onApprove(
	confirm: any,
	message: string,
	callback: () => void,
	config?: {
		acceptPropsLabel: string,
		acceptPropsSeverity: string
	}
) {
	confirm.require({
		message,
		header: 'Confirm Action',
		icon: 'pi pi-exclamation-triangle',
		rejectProps: {
			label: 'Cancel',
			severity: 'secondary',
			outlined: true
		},
		acceptProps: {
			label: config?.acceptPropsLabel || 'Confirm',
			severity: config?.acceptPropsSeverity
		},
		accept: callback,
	});
}

export function onDelete<T>(
	confirm: any,
	item: T | null,
	onAccept: (item: T) => void,
	message = 'Are you sure about deleting the record?'
) {
	if (!item) return ;

	confirm.require({
		message,
		header: 'Confirmar acción',
		icon: 'pi pi-exclamation-triangle',
		rejectProps: {
			label: 'Cancelar',
			severity: 'secondary',
			outlined: true
		},
		acceptProps: {
			label: 'Eliminar',
			severity: 'danger'
		},
		accept: () => onAccept(item),
	});
}

export async function deleteItem(
	service: ModelApiService,
	item: APIData,
	onSuccess: () => void,
	onError: (error: unknown) => void
) {
	try {
		await service.delete(item._id as string)
		onSuccess()
	} catch (error: unknown) {
		onError(error)
	}
}
