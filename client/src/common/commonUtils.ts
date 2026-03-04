import {AddNewTaskResponse, Task} from "./commonTypes";
import {RgbColor} from "react-colorful";

export function mapAddNewTaskResponseToTask(dto : AddNewTaskResponse) : Task {
    return {
        id: dto.id,
        title: dto.title,
        description: dto.description,
        assignedTo: dto.assignedTo,
        priority: dto.priority,
        dueDate: dto.dueDate,
    };
}

export function generateRandomMongoId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const randomValue = Math.floor(Math.random() * 16777215).toString(16);
    return `${timestamp}0000000000000000${randomValue}`.slice(0, 24);
}

export function rgbToString(color: RgbColor): string {
    return `rgb(${color.r}, ${color.g}, ${color.b}`;
}
