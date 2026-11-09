/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export {Budget} from '#components/budget';

export {Schedules} from '#components/schedules';
export {Schedules as ScheduleEdit} from '#components/schedules';

export {GoCardlessLink} from '#components/gocardless/GoCardlessLink';

export {Account as Accounts} from '#components/accounts/Account';
export {Account} from '#components/accounts/Account';

export {ManageRulesPage as Rules} from '#components/ManageRulesPage';
export {ManageRulesPage as RuleEdit} from '#components/ManageRulesPage';
export {ManagePayeesPage as Payees} from '#components/payees/ManagePayeesPage';
export {ManagePayeesPage as PayeeEdit} from '#components/payees/ManagePayeesPage';

export {BankSync} from '#components/banksync';

export {UserDirectoryPage} from '#components/admin/UserDirectory/UserDirectoryPage';

// Account component is currently used for uncategorized transactions view.
// Need to separate this to it's own component in the future.
export {Account as Category} from '#components/accounts/Account';
