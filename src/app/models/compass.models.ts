export interface CompassComponent {
    id: string;
    name: string;
    type: string;
    description?: string;
}

export interface CompassResponse<T> {
    data: {
        compass: T;
    };
}

export interface SearchComponentsResponse {
    searchComponents: {
        nodes: {
            component: CompassComponent;
        }[];
    };
}

export interface ComponentRelationsResponse {
    component: {
        id: string;
        name: string;
        contains?: RelationshipConnection;
        containedIn?: RelationshipConnection;
        dependsOn?: RelationshipConnection;
        dependedOnBy?: RelationshipConnection;
    };
}

export interface RelationshipConnection {
    nodes: {
        relationshipType: string;
        startNode: {
            id: string;
            name: string;
        };
        endNode: {
            id: string;
            name: string;
        };
    }[];
}

export interface GraphNeighbors {
    contains: CompassComponent[];
    containedIn: CompassComponent[];
    dependsOn: CompassComponent[];
    dependedOnBy: CompassComponent[];
    component?: CompassComponent;
}
