import { BaseService } from "@services/BaseService";
import type { PageResponse } from "@services/api";

/**
 * A comment on a process instance. Anchored to the instance, not the task, so
 * the thread follows the case across every task it passes through.
 */
export interface IComment {
    id: string;
    processInstanceId: string;
    /** The task the author was on when writing it — shown as context. */
    taskId?: string;
    taskName?: string;
    author: string;
    body: string;
    createdAt: string;
}

export interface CreateCommentDto {
    body: string;
    taskId?: string;
    taskName?: string;
}

export class CommentsService extends BaseService {
    constructor() {
        super("bpmn");
    }

    /** Newest first. `page` is 1-based. */
    async listForInstance(
        processInstanceId: string,
        page = 1,
        rowsPerPage = 20,
    ): Promise<PageResponse<IComment>> {
        return this.get<PageResponse<IComment>>(
            `process-instances/${processInstanceId}/comments`,
            { params: { page, rowsPerPage } },
        );
    }

    async create(processInstanceId: string, payload: CreateCommentDto): Promise<IComment> {
        return this.post<IComment>(
            `process-instances/${processInstanceId}/comments`,
            payload,
        );
    }

    /**
     * `taskId` is the task the user is deleting from — the server refuses unless
     * it matches the one the comment was written on.
     */
    async remove(commentId: string, taskId: string): Promise<void> {
        await this.delete(`comments/${commentId}?taskId=${encodeURIComponent(taskId)}`);
    }
}
