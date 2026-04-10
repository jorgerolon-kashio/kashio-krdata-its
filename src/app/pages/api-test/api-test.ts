import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import * as yaml from 'js-yaml';
import { EnvironmentService } from '../../services/environment.service';
import { ApmService } from '../../services/apm.service';

interface ApiEndpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  contentTypes: string[];
}

interface FormField {
  key: string;
  value: any;
  type: 'text' | 'file';
  file?: File | null;
}

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="api-playground-container">
      <!-- Sidebar de Endpoints -->
      <aside class="endpoints-sidebar">
        <div class="sidebar-header">
          <div class="header-main">
            <lucide-icon name="terminal" [size]="20"></lucide-icon>
            <h3>Endpoints</h3>
          </div>
          
          <div class="selection-container">
            <!-- Selector de Ambientes -->
            <div class="selection-group">
              <label class="selection-label">Ambiente</label>
              
              <ng-container *ngIf="!isApmRestricted(); else restrictedView">
                <div class="apm-env-selector" *ngIf="availableEnvs().length > 0">
                  <button 
                    *ngFor="let env of availableEnvs()" 
                    class="env-btn" 
                    [class.active]="selectedApmEnv() === env"
                    (click)="selectApmEnv(env)">
                    {{ env }}
                  </button>
                </div>
                <div *ngIf="availableEnvs().length === 0" class="env-loading">
                    <lucide-icon name="refresh-cw" class="spin" [size]="12"></lucide-icon>
                    <span>Buscando ambientes...</span>
                </div>
              </ng-container>

              <ng-template #restrictedView>
                <div class="restricted-badge">
                  <lucide-icon name="lock" [size]="12"></lucide-icon>
                  <span>Métricas restringidas a ambientes bajos</span>
                </div>
              </ng-template>
            </div>

            <!-- Selector de Documentos (NUEVO) -->
            <div class="selection-group">
              <label class="selection-label">Especificación API</label>
              <div class="doc-selector">
                <button 
                  *ngFor="let doc of availableDocs" 
                  class="doc-btn" 
                  [class.active]="selectedDoc()?.path === doc.path"
                  (click)="selectDoc(doc)"
                  [title]="doc.name">
                  <lucide-icon [name]="doc.icon" [size]="14"></lucide-icon>
                  <span>{{ doc.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="search-box">
          <lucide-icon name="search" [size]="16"></lucide-icon>
          <input type="text" placeholder="Filtrar endpoints..." [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)">
        </div>

        <nav class="endpoints-list">
          <div *ngFor="let group of groupedEndpoints()" class="tag-group">
            <h4 class="tag-name">{{ group.tag }}</h4>
            <div 
              *ngFor="let endpoint of group.endpoints" 
              class="endpoint-item"
              [class.active]="selectedEndpoint() === endpoint"
              (click)="selectEndpoint(endpoint)"
            >
              <span class="method-badge" [ngClass]="'method-' + endpoint.method.toLowerCase()">
                {{ endpoint.method }}
              </span>
              <span class="path-text">{{ endpoint.path }}</span>
            </div>
          </div>
          
          <div *ngIf="loading()" class="loading-state">
             <lucide-icon name="refresh-cw" class="spin"></lucide-icon>
             <span>Cargando especificación...</span>
          </div>
          
          <div *ngIf="error()" class="error-state">
             <lucide-icon name="alert-triangle"></lucide-icon>
             <span>Error al cargar API</span>
          </div>
        </nav>
      </aside>

      <!-- Panel de Pruebas Principal -->
      <main class="test-panel">
        <div *ngIf="selectedEndpoint(); else noSelection" class="active-test">
          <header class="test-header">
            <div class="title-row">
              <span class="method-tag" [ngClass]="'method-' + selectedEndpoint()?.method?.toLowerCase()">
                {{ selectedEndpoint()?.method }}
              </span>
              <h2>{{ selectedEndpoint()?.path }}</h2>
            </div>
            <p class="summary">{{ selectedEndpoint()?.summary }}</p>
          </header>

          <div class="test-form card">
            <div class="section-title">
              <lucide-icon name="settings" [size]="16"></lucide-icon>
              <h4>Configuración de la Petición</h4>
            </div>

            <!-- Parámetros (Path, Query) -->
            <div *ngIf="selectedEndpoint()?.parameters?.length" class="params-section">
               <label>Parámetros</label>
               <div *ngFor="let param of selectedEndpoint()?.parameters" class="param-row">
                 <span class="param-name">
                   {{ param.name }} 
                   <span class="param-info">({{ param.in }})</span>
                   <span *ngIf="param.required" class="required-mark">*</span>
                 </span>
                 <input 
                   type="text" 
                   [placeholder]="param.description || 'valor'" 
                   class="param-input"
                   [(ngModel)]="paramValues[param.name]"
                 >
               </div>
            </div>

            <!-- Request Body -->
            <div *ngIf="selectedEndpoint()?.requestBody" class="body-section">
               <div class="body-header">
                  <label>Request Body</label>
                  <div class="content-type-selector" *ngIf="selectedEndpoint()?.contentTypes?.length">
                    <select [ngModel]="selectedContentType()" (ngModelChange)="onContentTypeChange($event)">
                      <option *ngFor="let type of selectedEndpoint()?.contentTypes" [value]="type">{{ type }}</option>
                    </select>
                  </div>
               </div>
               
               <!-- MODO POSTMAN: Form Data Grid -->
               <div *ngIf="selectedContentType().includes('multipart')" class="form-data-grid">
                  <div class="grid-header">
                    <span>Key</span>
                    <span>Type</span>
                    <span>Value</span>
                  </div>
                  <div *ngFor="let field of formFields()" class="grid-row">
                    <div class="key-cell">
                      <input type="text" [(ngModel)]="field.key" placeholder="Key" class="grid-input">
                    </div>
                    <div class="type-cell">
                      <select [(ngModel)]="field.type" (change)="field.file = null" class="grid-select">
                        <option value="text">Text</option>
                        <option value="file">File</option>
                      </select>
                    </div>
                    <div class="value-cell">
                      <input *ngIf="field.type === 'text'" type="text" [(ngModel)]="field.value" placeholder="Value" class="grid-input">
                      <div *ngIf="field.type === 'file'" class="file-cell-wrapper">
                        <input type="file" (change)="onGridFileSelected($event, field)" class="file-grid-input">
                        <span class="file-name-hint" *ngIf="field.file">{{ field.file.name }}</span>
                      </div>
                    </div>
                  </div>
                  <button class="add-field-btn" (click)="addFormField()">
                    <lucide-icon name="plus" [size]="14"></lucide-icon>
                    Agregar Campo
                  </button>
               </div>

               <!-- MODO BINARY: File Input (application/octet-stream) -->
               <div *ngIf="selectedContentType() === 'application/octet-stream'" class="binary-upload-section">
                  <div class="file-drop-zone" (click)="fileInput.click()">
                    <lucide-icon name="upload-cloud" [size]="32"></lucide-icon>
                    <div class="drop-text">
                      <span class="main-text">{{ binaryFile() ? binaryFile()?.name : 'Seleccionar archivo para subir...' }}</span>
                      <span class="sub-text" *ngIf="binaryFile()">{{ (binaryFile()?.size || 0) / 1024 | number:'1.0-2' }} KB</span>
                    </div>
                    <input type="file" #fileInput (change)="onBinaryFileSelected($event)" style="display: none">
                  </div>
                  <div class="hint">
                    <lucide-icon name="info" [size]="14"></lucide-icon>
                    <span>El archivo se enviará como cuerpo binario (raw body)</span>
                  </div>
               </div>

               <!-- MODO JSON: Textarea -->
               <textarea 
                 *ngIf="!selectedContentType().includes('multipart') && selectedContentType() !== 'application/octet-stream'"
                 rows="8" 
                 class="json-textarea" 
                 [(ngModel)]="requestBodyValue"
                 placeholder='{ "key": "value" }'
               ></textarea>
            </div>

            <div class="actions">
              <button class="run-button" (click)="runTest()" [disabled]="running()">
                <lucide-icon [name]="running() ? 'refresh-cw' : 'play-circle'" [class.spin]="running()" [size]="20"></lucide-icon>
                {{ running() ? 'Enviando...' : 'Ejecutar Prueba' }}
              </button>
            </div>
          </div>

          <!-- Resultados Reales -->
          <div *ngIf="response()" class="response-section card">
            <div class="response-header">
               <div class="status-info">
                 <lucide-icon name="info" [size]="16"></lucide-icon>
                 <h4>Respuesta del Servidor</h4>
                 <span class="status-badge" [class.status-ok]="response().status >= 200 && response().status < 300">
                    {{ response().status }} {{ response().statusText }}
                 </span>
               </div>
               <span class="time-taken">{{ response().time }}ms</span>
            </div>
            <pre class="json-viewer">{{ response().body | json }}</pre>
          </div>
          
          <div *ngIf="testError()" class="error-section card">
             <div class="error-header">
                <lucide-icon name="alert-circle" [size]="20"></lucide-icon>
                <h4>Error en la Petición</h4>
             </div>
             <p class="error-msg">{{ testError().message }}</p>
             <pre class="json-viewer error-preview">{{ testError().error | json }}</pre>
          </div>
        </div>

        <ng-template #noSelection>
          <div class="empty-state">
            <lucide-icon name="play-circle" [size]="64"></lucide-icon>
            <h3>Bienvenido al API Playground</h3>
            <p>Selecciona un endpoint de la izquierda para comenzar las pruebas.</p>
            <div class="spec-info" *ngIf="selectedDoc()">
               <lucide-icon name="file-text" [size]="16"></lucide-icon>
               <span>{{ selectedDoc().name }} ({{ selectedDoc().path }})</span>
            </div>
            <div class="spec-info" *ngIf="!selectedDoc() && !loading() && !error()">
               <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
               <span>No se encontraron documentos en la carpeta docs/</span>
            </div>
          </div>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    .api-playground-container {
      display: flex;
      gap: 0;
      background: #F8FAFC;
      border-radius: 20px;
      overflow: hidden;
      height: calc(100vh - 160px); 
      box-shadow: var(--shadow-soft);
    }

    /* Sidebar Styles */
    .endpoints-sidebar {
      width: 320px;
      flex-shrink: 0;
      background: white;
      border-right: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .sidebar-header {
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-bottom: 1px solid #F1F5F9;
      flex-shrink: 0;
    }

    .selection-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .selection-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .selection-label {
      font-size: 10px;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin-left: 4px;
    }

    .apm-env-selector {
      display: flex;
      background: #F1F5F9;
      padding: 3px;
      border-radius: 10px;
      width: 100%;
      gap: 2px;
    }

    .doc-selector {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      width: 100%;
    }

    .doc-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      background: white;
      color: #64748B;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-btn:hover {
      border-color: #CBD5E1;
      background: #F8FAFC;
    }

    .doc-btn.active {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.05);
    }

    .doc-btn lucide-icon {
      flex-shrink: 0;
    }
    
    .env-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #F8FAFC;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      width: 100%;
      justify-content: center;
      font-size: 12px;
      color: #64748B;
      font-weight: 600;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }

    .apm-env-selector .env-btn {
      flex: 1;
      border: none;
      padding: 6px 2px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 7px;
      cursor: pointer;
      background: transparent;
      color: #64748B;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .apm-env-selector .env-btn.active {
      background: white;
      color: #2563EB;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .apm-env-selector .env-btn:hover:not(.active) {
      color: #2563EB;
    }

    .header-main {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-main h3 { font-size: 16px; font-weight: 700; color: #1E293B; margin: 0; }
    .header-main lucide-icon { color: var(--primary); }

    .search-box {
      padding: 8px 16px 12px;
      position: relative;
      flex-shrink: 0;
    }

    .search-box lucide-icon {
      position: absolute;
      left: 36px;
      top: 50%;
      transform: translateY(-50%);
      color: #94A3B8;
    }

    .search-box input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      background: #F1F5F9;
      border: 1px solid transparent;
      border-radius: 10px;
      font-size: 13px;
      transition: all 0.2s;
    }

    .search-box input:focus {
      background: white;
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .endpoints-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 0;
    }

    .tag-group { margin-bottom: 16px; }
    .tag-name {
      padding: 0 24px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94A3B8;
      font-weight: 700;
    }

    .endpoint-item {
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .endpoint-item:hover { background: #F8FAFC; }
    .endpoint-item.active {
      background: #EFF6FF;
      border-left-color: var(--primary);
    }

    .method-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 4px;
      min-width: 42px;
      text-align: center;
    }

    .method-get { background: #E0F2FE; color: #0369A1; }
    .method-post { background: #DCFCE7; color: #15803D; }
    .method-put { background: #FEF9C3; color: #854D0E; }
    .method-delete { background: #FEE2E2; color: #B91C1C; }

    .path-text {
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .endpoint-item.active .path-text { color: #1E293B; font-weight: 600; }

    /* Main Panel Styles */
    .test-panel {
      flex: 1;
      padding: 40px;
      overflow-y: auto;
      background: white;
      height: 100%;
    }

    .test-header { margin-bottom: 32px; }
    .title-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .method-tag {
      font-weight: 800;
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 8px;
    }
    .test-header h2 { font-size: 24px; font-weight: 800; color: #1E293B; font-family: monospace; }
    .test-header .summary { color: #64748B; font-size: 15px; }

    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #F1F5F9;
      margin-bottom: 24px;
    }

    .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; color: #1E293B; }
    .section-title h4 { font-weight: 700; font-size: 15px; }

    .test-form label { display: block; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 8px; }
    .param-row { display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center; margin-bottom: 12px; }
    .param-name { font-size: 13px; color: #475569; font-family: monospace; display: flex; align-items: center; gap: 4px; }
    .param-info { font-size: 10px; color: #94A3B8; }
    .required-mark { color: #EF4444; font-weight: bold; }
    .param-input {
      padding: 10px 16px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      font-size: 13px;
    }

    .json-textarea {
      width: 100%;
      padding: 16px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      background: #F8FAFC;
    }

    .actions { margin-top: 32px; display: flex; justify-content: flex-end; }
    .run-button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .run-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); }
    .run-button:disabled { opacity: 0.6; cursor: not-allowed; }

    .response-section {
      background: #1E293B;
      color: #F1F5F9;
    }

    .response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 16px;
    }

    .status-info { display: flex; align-items: center; gap: 12px; }
    .status-badge {
      background: rgba(239, 68, 68, 0.2);
      color: #F87171;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
    }
    .status-badge.status-ok {
      background: rgba(34, 197, 94, 0.2);
      color: #4ADE80;
    }

    .json-viewer {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #CBD5E1;
      overflow-x: auto;
    }

    .body-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .content-type-selector select {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      font-size: 11px;
      background: #F8FAFC;
      color: #64748B;
      font-weight: 600;
    }
    .hint {
      margin-top: 8px;
      font-size: 11px;
      color: #64748B;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .file-uploads-section {
      margin-bottom: 16px;
      padding: 16px;
      background: #F1F5F9;
      border-radius: 12px;
      border: 1px dashed #CBD5E1;
    }
    .file-input-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    .file-input-row:last-child { margin-bottom: 0; }
    .file-control {
      font-size: 12px;
      color: #475569;
    }

    .binary-upload-section {
      padding: 10px 0;
    }

    .file-drop-zone {
      border: 2px dashed #E2E8F0;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
      background: #F8FAFC;
    }

    .file-drop-zone:hover {
      border-color: var(--primary);
      background: #EFF6FF;
    }

    .file-drop-zone lucide-icon {
      color: #94A3B8;
    }

    .file-drop-zone:hover lucide-icon {
      color: var(--primary);
    }

    .drop-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .main-text {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }

    .sub-text {
      font-size: 12px;
      color: #94A3B8;
    }

    .binary-upload-section .hint {
      margin-top: 12px;
      color: #64748B;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .error-section {
      border: 1px solid #FEE2E2;
      background: #FFFBFB;
      border-radius: 16px;
      padding: 24px;
      margin-top: 24px;
    }

    /* Form Data Grid Styles */
    .form-data-grid {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    .grid-header {
      display: grid;
      grid-template-columns: 1fr 100px 2fr;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
    }
    .grid-row {
      display: grid;
      grid-template-columns: 1fr 100px 2fr;
      border-bottom: 1px solid #F1F5F9;
      padding: 0;
    }
    .grid-row:last-child { border-bottom: none; }
    .key-cell, .type-cell, .value-cell {
      padding: 8px;
      border-right: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
    }
    .value-cell { border-right: none; }
    
    .grid-input {
      width: 100%;
      border: none;
      padding: 6px 8px;
      font-size: 13px;
      background: transparent;
      color: #1E293B;
    }
    .grid-input:focus { outline: none; background: #F8FAFC; }
    
    .grid-select {
      border: none;
      background: transparent;
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      width: 100%;
    }
    
    .file-grid-input {
      font-size: 11px;
      width: 100%;
    }
    .file-cell-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    .file-name-hint {
      font-size: 10px;
      color: var(--primary);
      font-weight: 600;
    }
    
    .add-field-btn {
      width: 100%;
      padding: 10px;
      background: #F8FAFC;
      border: none;
      border-top: 1px solid #E2E8F0;
      font-size: 12px;
      color: #64748B;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .add-field-btn:hover { background: #F1F5F9; color: var(--primary); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748B;
      text-align: center;
      padding: 40px;
    }
    .empty-state > lucide-icon {
      margin-bottom: 24px;
      color: #E2E8F0;
    }
    .empty-state h3 {
      font-size: 24px;
      font-weight: 800;
      color: #1E293B;
      margin-bottom: 12px;
    }
    .empty-state p {
      font-size: 16px;
      margin-bottom: 32px;
      max-width: 450px;
      line-height: 1.6;
    }
    .spec-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      font-size: 13px;
      color: #64748B;
      font-weight: 500;
    }
    .spec-info lucide-icon {
      color: #94A3B8;
      margin-bottom: 0;
    }
    .restricted-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #FFF7ED;
      border: 1px solid #FFEDD5;
      border-radius: 8px;
      color: #9A3412;
      font-size: 11px;
      font-weight: 600;
    }
    .restricted-badge lucide-icon {
      color: #EA580C;
    }
  `]
})
export class ApiTestComponent implements OnInit {
  private http = inject(HttpClient);

  public availableDocs: any[] = [];
  selectedDoc = signal<any>(null);

  spec: any = null;
  endpoints = signal<ApiEndpoint[]>([]);
  loading = signal(true);
  error = signal(false);

  public envService = inject(EnvironmentService);
  private apmService = inject(ApmService);

  availableEnvs = computed(() => {
    const urls = this.apmService.dynamicUrls();
    // Permitimos ambientes que empiecen con D, Q o S (por D1, Q1, S1 etc) o que contengan DEV/QA/STG
    return urls
      .map(u => u.env)
      .filter((env: string) => {
        const e = env.toUpperCase();
        return e.startsWith('D') || e.startsWith('Q') || e.startsWith('S') ||
          e.includes('DEV') || e.includes('QA') || e.includes('STG');
      });
  });

  isApmRestricted = computed(() => {
    const currentGlobalEnv = this.envService.getCurrentEnv()().toUpperCase();
    const lowEnvs = ['DEV', 'QA', 'STG'];
    // Si el ambiente global no contiene alguna de las siglas de ambientes bajos, se restringe
    return !lowEnvs.some(low => currentGlobalEnv.includes(low));
  });

  selectedApmEnv = signal('');

  // Effect to set initial env when they become available
  constructor() {
    effect(() => {
      const envs = this.availableEnvs();
      if (envs.length > 0 && !this.selectedApmEnv()) {
        this.selectedApmEnv.set(envs[0]);
      }
    }, { allowSignalWrites: true });
  }

  searchTerm = signal('');
  selectedEndpoint = signal<ApiEndpoint | null>(null);

  // State for request inputs
  paramValues: { [key: string]: string } = {};
  requestBodyValue: string = '';
  selectedContentType = signal<string>('application/json');
  formFields = signal<FormField[]>([]);
  binaryFile = signal<File | null>(null);

  // State for request execution
  running = signal(false);
  response = signal<any>(null);
  testError = signal<any>(null);

  ngOnInit() {
    this.loadDocsManifest();
  }

  private loadDocsManifest() {
    this.http.get<any[]>('/docs-manifest.json').subscribe({
      next: (docs) => {
        this.availableDocs = docs;
        if (docs.length > 0) {
          this.selectedDoc.set(docs[0]);
          this.loadSpec();
        } else {
          this.loading.set(false);
          this.error.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading docs manifest:', err);
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  selectApmEnv(env: string) {
    this.selectedApmEnv.set(env);
  }

  selectDoc(doc: any) {
    this.selectedDoc.set(doc);
    this.selectedEndpoint.set(null); // Reset selection
    this.loadSpec();
  }

  private loadSpec() {
    if (!this.selectedDoc()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.http.get(this.selectedDoc().path, { responseType: 'text' }).subscribe({
      next: (yamlContent) => {
        try {
          this.spec = yaml.load(yamlContent);
          this.parseSpec(this.spec);
          this.loading.set(false);
        } catch (e) {
          console.error('Error parsing YAML:', e);
          this.error.set(true);
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading spec:', err);
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  // ... (parseSpec and other methods remain unchanged)

  async runTest() {
    const endpoint = this.selectedEndpoint();
    if (!endpoint) return;

    this.running.set(true);
    this.response.set(null);
    this.testError.set(null);
    const startTime = Date.now();

    try {
      // Construct dynamic URL based on selected APM environment
      const currentEnvName = this.selectedApmEnv();

      if (!currentEnvName) {
        throw new Error("Por favor, selecciona un ambiente en el panel izquierdo antes de ejecutar la prueba.");
      }

      const dynamicUrls = this.apmService.dynamicUrls();
      const selectedEnvObj = dynamicUrls.find(u => u.env === currentEnvName);

      let baseUrl = '';
      const envLower = currentEnvName.toLowerCase();
      const domain = this.envService.getDomainByEnv(envLower);

      let servicePrefix = '';
      if (this.spec?.servers?.[0]?.url) {
        let serverUrl = this.spec.servers[0].url;
        // Extraer el prefijo eliminando los placeholders (ej: {{Base_url}}kmfef-kbatch/v1 -> /kmfef-kbatch/v1)
        servicePrefix = serverUrl.replace(/\{\{[^}]+\}\}/g, '').replace(/\{[^}]+\}/g, '');
        if (servicePrefix && !servicePrefix.startsWith('/')) servicePrefix = '/' + servicePrefix;
      }

      // Si no tenemos prefijo de la spec, intentamos sacarlo de la URL de salud (fallback)
      if (!servicePrefix) {
        const healthUrl = this.apmService.API_HEALTH();
        if (healthUrl) {
          try {
            const hUrlObj = new URL(healthUrl);
            const parts = hUrlObj.pathname.split('/').filter(p => !!p);
            // Si el health URL es /prefix/v1/health -> queremos /prefix/v1
            if (parts.length > 1) {
              // Asumimos que el último segmento es el recurso de salud y el resto es el base path
              servicePrefix = '/' + parts.slice(0, -1).join('/');
            } else if (parts.length > 0) {
              servicePrefix = `/${parts[0]}`;
            }
          } catch (e) { }
        }
      }

      // Aseguramos que termine sin slash para concatenar con el path que SI tiene slash
      if (servicePrefix.endsWith('/')) servicePrefix = servicePrefix.slice(0, -1);

      const defaultBaseUrl = `https://${envLower}-api.${domain}${servicePrefix}`;

      if (selectedEnvObj) {
        try {
          const urlObj = new URL(selectedEnvObj.url);
          const protocol = urlObj.protocol;
          const host = urlObj.host;
          // Usamos el servicePrefix que ya calculamos arriba para no perder segmentos como /v1
          baseUrl = `${protocol}//${host}${servicePrefix}`;
        } catch (e) {
          baseUrl = defaultBaseUrl;
        }
      } else {
        baseUrl = defaultBaseUrl;
      }

      // Replace parameter placeholders in path
      let path = endpoint.path;
      if (!path.startsWith('/')) path = '/' + path;
      if (endpoint.parameters) {
        endpoint.parameters.forEach((param: any) => {
          if (param.in === 'path') {
            path = path.replace(`{${param.name}}`, this.paramValues[param.name] || '');
          }
        });
      }

      const url = `${baseUrl}${path}`;

      // Construct Query Params
      let params = new HttpParams();
      if (endpoint.parameters) {
        endpoint.parameters.forEach((param: any) => {
          if (param.in === 'query' && this.paramValues[param.name]) {
            params = params.set(param.name, this.paramValues[param.name]);
          }
        });
      }

      // Headers & Body Logic
      const headers = new HttpHeaders();
      // ... (rest of logic handles content-type and body)

      let body: any = null;
      if (this.selectedContentType() === 'application/json') {
        try {
          body = this.requestBodyValue ? JSON.parse(this.requestBodyValue) : {};
        } catch (e) {
          throw new Error("Invalid JSON in request body");
        }
      } else if (this.selectedContentType().includes('multipart')) {
        const formData = new FormData();
        this.formFields().forEach(field => {
          if (field.type === 'text') {
            formData.append(field.key, field.value);
          } else if (field.file) {
            formData.append(field.key, field.file);
          }
        });
        body = formData;
      } else if (this.selectedContentType() === 'application/octet-stream') {
        body = this.binaryFile();
      }

      // Execute Request
      this.http.request(endpoint.method, url, {
        body,
        headers,
        params,
        observe: 'response'
      }).subscribe({
        next: (res) => {
          this.response.set({
            status: res.status,
            statusText: res.statusText,
            body: res.body,
            time: Date.now() - startTime
          });
          this.running.set(false);
        },
        error: (err) => {
          this.testError.set({
            message: err.message,
            error: err.error || err.statusText
          });
          this.running.set(false);
        }
      });

    } catch (err: any) {
      this.testError.set({
        message: err.message,
        error: null
      });
      this.running.set(false);
    }
  }

  private parseSpec(spec: any) {
    const list: ApiEndpoint[] = [];
    if (spec.paths) {
      Object.keys(spec.paths).forEach(path => {
        const methods = spec.paths[path];
        Object.keys(methods).forEach(method => {
          const details = methods[method];
          const contentTypes = details.requestBody?.content ? Object.keys(details.requestBody.content) : [];
          list.push({
            path,
            method: method.toUpperCase(),
            summary: details.summary,
            description: details.description,
            tags: details.tags || ['General'],
            parameters: details.parameters || [],
            requestBody: details.requestBody,
            responses: details.responses,
            contentTypes: contentTypes
          });
        });
      });
    }
    this.endpoints.set(list);
  }

  groupedEndpoints = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filtered = this.endpoints().filter(e =>
      e.path.toLowerCase().includes(term) ||
      e.summary?.toLowerCase().includes(term) ||
      e.tags?.some(t => t.toLowerCase().includes(term))
    );

    const groups: { tag: string, endpoints: ApiEndpoint[] }[] = [];
    filtered.forEach(e => {
      const tag = e.tags?.[0] || 'General';
      let group = groups.find(g => g.tag === tag);
      if (!group) {
        group = { tag, endpoints: [] };
        groups.push(group);
      }
      group.endpoints.push(e);
    });

    return groups.sort((a, b) => a.tag.localeCompare(b.tag));
  });

  selectEndpoint(endpoint: ApiEndpoint) {
    this.selectedEndpoint.set(endpoint);
    this.response.set(null);
    this.testError.set(null);
    this.paramValues = {};
    this.requestBodyValue = '';
    this.formFields.set([]);
    this.binaryFile.set(null);

    // Auto-prepopulate example values if available
    if (endpoint.parameters) {
      endpoint.parameters.forEach(p => {
        if (p.example) this.paramValues[p.name] = p.example;
        else if (p.schema?.default) this.paramValues[p.name] = p.schema.default;
      });
    }

    if (endpoint.requestBody) {
      const types = endpoint.contentTypes;
      const firstType = types[0] || 'application/json';
      this.selectedContentType.set(firstType);
      this.initBodyForType(firstType);
    } else {
      this.selectedContentType.set('application/json');
    }
  }

  onContentTypeChange(type: string) {
    this.selectedContentType.set(type);
    this.binaryFile.set(null); // Reset binary file when changing type
    this.initBodyForType(type);
  }

  initBodyForType(type: string) {
    const endpoint = this.selectedEndpoint();
    if (!endpoint?.requestBody?.content) return;

    const content = endpoint.requestBody.content[type];

    if (type.includes('multipart')) {
      // Valores por defecto fijos en código
      this.formFields.set([{
        key: 'picture_url',
        type: 'file',
        value: '',
        file: null
      }]);
    } else {
      // Modo JSON
      if (type === 'application/json') {
        if (content?.example) {
          this.requestBodyValue = JSON.stringify(content.example, null, 2);
        } else if (content?.schema?.example) {
          this.requestBodyValue = JSON.stringify(content.schema.example, null, 2);
        } else {
          this.requestBodyValue = this.generateTemplateFromSchema(content?.schema);
        }
      } else {
        this.requestBodyValue = this.generateTemplateFromSchema(content?.schema);
      }
    }
  }

  addFormField() {
    this.formFields.update(fields => [...fields, { key: 'picture_url', value: '', type: 'file', file: null }]);
  }

  onGridFileSelected(event: any, field: FormField) {
    const file = event.target.files[0];
    if (file) {
      field.file = file;
    }
  }

  onBinaryFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.binaryFile.set(file);
    }
  }

  generateTemplateFromSchema(schema: any): string {
    if (!schema) return '{ }';

    // Resolve $ref if it's a simple internal ref (common in this spec)
    let targetSchema = schema;
    if (schema.$ref && this.spec?.components?.schemas) {
      const refName = schema.$ref.split('/').pop();
      targetSchema = this.spec.components.schemas[refName] || schema;
    }

    if (targetSchema.type === 'object' && targetSchema.properties) {
      const template: any = {};
      Object.entries(targetSchema.properties).forEach(([key, prop]: [string, any]) => {
        // Use default value if it exists in the YAML
        if (prop.hasOwnProperty('default')) {
          template[key] = prop.default;
        } else if (prop.format === 'binary') {
          // Skip binary fields in the JSON body
        } else {
          // Just put a placeholder based on type
          template[key] = prop.type === 'integer' || prop.type === 'number' ? 0 :
            prop.type === 'boolean' ? false : "";
        }
      });
      return JSON.stringify(template, null, 2);
    }

    return '{ }';
  }

}
