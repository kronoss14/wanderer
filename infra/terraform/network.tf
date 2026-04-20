# ── network.tf ──────────────────────────────────────────
# Networking resources. Before VMs can exist, they need a network to live in.
# Think of it like building roads before putting houses on them.

# ── Resource Group ──
# A logical container that holds all related Azure resources.
# Like a folder — when you delete the resource group, everything inside dies.
# This is how we'll clean up everything when we're done learning.
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

# ── Virtual Network (VNet) ──
# A private network in Azure. Your VMs communicate through this.
# 10.0.0.0/16 = 65,536 IP addresses (10.0.0.0 to 10.0.255.255).
# You learned subnetting in CCNA — same concept here.
resource "azurerm_virtual_network" "main" {
  name                = "wanderer-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# ── Subnet ──
# A slice of the VNet. Our VMs will get IPs from this range.
# 10.0.1.0/24 = 256 addresses (10.0.1.0 to 10.0.1.255). More than enough.
resource "azurerm_subnet" "main" {
  name                 = "wanderer-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# ── Network Security Group (NSG) ──
# Firewall rules. Controls what traffic can reach our VMs.
# Like an ACL on a Cisco router — you know this from CCNA.
resource "azurerm_network_security_group" "main" {
  name                = "wanderer-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # Allow SSH (port 22) — so we can connect to the VMs
  security_rule {
    name                       = "AllowSSH"
    priority                   = 1000          # lower number = higher priority
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"           # from anywhere (in production, lock this to your IP)
    destination_address_prefix = "*"
  }

  # Allow HTTP (port 80)
  security_rule {
    name                       = "AllowHTTP"
    priority                   = 1010
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow HTTPS (port 443) — Rancher UI runs on HTTPS
  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 1020
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow Kubernetes API (port 6443) — kubectl talks to this port
  security_rule {
    name                       = "AllowK8sAPI"
    priority                   = 1030
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow NodePort range (30000-32767) — K8s exposes services here
  security_rule {
    name                       = "AllowNodePorts"
    priority                   = 1040
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "30000-32767"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
