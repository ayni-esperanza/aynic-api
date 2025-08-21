import { Injectable } from '@nestjs/common';

export interface EmpresaPermissions {
  canViewAllRecords: boolean;
  canViewOtherCompanyRecords: boolean;
  allowedCompanies: string[];
  empresa: string;
  isAyniUser: boolean;
}

@Injectable()
export class EmpresaPermissionsService {
  private readonly AYNI_COMPANY_NAME = 'Ayni';

  /**
   * Determina los permisos basados en la empresa del usuario
   */
  getPermissions(userEmpresa: string): EmpresaPermissions {
    const isAyniUser = this.isAyniUser(userEmpresa);

    return {
      canViewAllRecords: isAyniUser,
      canViewOtherCompanyRecords: isAyniUser,
      allowedCompanies: isAyniUser ? ['*'] : [userEmpresa],
      empresa: userEmpresa,
      isAyniUser,
    };
  }

  /**
   * Verifica si un usuario pertenece a Ayni
   */
  isAyniUser(empresa: string): boolean {
    return empresa?.toLowerCase() === this.AYNI_COMPANY_NAME.toLowerCase();
  }

  /**
   * Verifica si un usuario puede ver registros de una empresa específica
   */
  canViewCompanyRecords(userEmpresa: string, targetEmpresa: string): boolean {
    const permissions = this.getPermissions(userEmpresa);

    if (permissions.canViewAllRecords) {
      return true; // Usuario de Ayni puede ver todo
    }

    return permissions.allowedCompanies.includes(targetEmpresa);
  }

  /**
   * Filtra una lista de empresas según los permisos del usuario
   */
  filterAllowedCompanies(userEmpresa: string, companies: string[]): string[] {
    const permissions = this.getPermissions(userEmpresa);

    if (permissions.canViewAllRecords) {
      return companies; // Ayni ve todas las empresas
    }

    // Otras empresas solo ven la suya
    return companies.filter((company) =>
      permissions.allowedCompanies.includes(company),
    );
  }

  /**
   * Obtiene las condiciones WHERE para filtrar registros según empresa
   */
  getRecordFilterConditions(userEmpresa: string): {
    shouldFilter: boolean;
    allowedClientes: string[] | null;
  } {
    const permissions = this.getPermissions(userEmpresa);

    if (permissions.canViewAllRecords) {
      return {
        shouldFilter: false,
        allowedClientes: null, // Sin filtro
      };
    }

    return {
      shouldFilter: true,
      allowedClientes: [userEmpresa], // Solo su empresa
    };
  }

  /**
   * Valida si un usuario puede realizar una acción sobre un registro
   */
  canAccessRecord(userEmpresa: string, recordCliente: string): boolean {
    const permissions = this.getPermissions(userEmpresa);

    if (permissions.canViewAllRecords) {
      return true; // Ayni puede acceder a cualquier registro
    }

    // Otras empresas solo pueden acceder a sus propios registros
    return recordCliente === userEmpresa;
  }

  /**
   * Obtiene mensaje de restricción para mostrar al usuario
   */
  getAccessDeniedMessage(userEmpresa: string): string {
    if (this.isAyniUser(userEmpresa)) {
      return 'Acceso denegado'; // No debería pasar para usuarios Ayni
    }

    return `Solo puede acceder a registros de su empresa: ${userEmpresa}`;
  }

  /**
   * Obtiene configuración para el frontend
   */
  getUIPermissions(userEmpresa: string): {
    showAllCompaniesFilter: boolean;
    defaultCompanyFilter: string | null;
    canCreateForOtherCompanies: boolean;
    restrictedMessage: string | null;
  } {
    const permissions = this.getPermissions(userEmpresa);

    if (permissions.isAyniUser) {
      return {
        showAllCompaniesFilter: true,
        defaultCompanyFilter: null,
        canCreateForOtherCompanies: true,
        restrictedMessage: null,
      };
    }

    return {
      showAllCompaniesFilter: false,
      defaultCompanyFilter: userEmpresa,
      canCreateForOtherCompanies: false,
      restrictedMessage: `Visualizando solo registros de: ${userEmpresa}`,
    };
  }
}
