# ── vms.tf ──────────────────────────────────────────────
# Virtual Machines. This is where Rancher and K8s will run.
# We create 2 VMs:
#   1. rancher-server — runs Rancher (the K8s management UI)
#   2. k8s-node      — the worker node where our app actually runs

# ══════════════════════════════════════════════════════════
# SSH KEY — how we'll connect to the VMs (no passwords, keys only)
# ══════════════════════════════════════════════════════════

# Generate an SSH key pair. Terraform creates it, we use it to SSH in.
# Private key = your identity (stays on your machine, never shared)
# Public key  = goes on the VM (proves you're you)
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Save the private key to a local file so we can SSH with it
resource "local_file" "ssh_private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/wanderer-key.pem"
  file_permission = "0600"    # only owner can read (SSH requires this)
}


# ══════════════════════════════════════════════════════════
# VM 1: RANCHER SERVER
# ══════════════════════════════════════════════════════════

# Public IP — so we can reach Rancher UI from our browser
resource "azurerm_public_ip" "rancher" {
  name                = "rancher-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"          # IP doesn't change on reboot
  sku                 = "Standard"
}

# Network Interface (NIC) — connects the VM to our VNet/Subnet
# Like plugging an ethernet cable from the VM into our virtual switch
resource "azurerm_network_interface" "rancher" {
  name                = "rancher-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"       # Azure assigns from the subnet range
    public_ip_address_id          = azurerm_public_ip.rancher.id
  }
}

# Attach NSG to the NIC (apply our firewall rules to this VM)
resource "azurerm_network_interface_security_group_association" "rancher" {
  network_interface_id      = azurerm_network_interface.rancher.id
  network_security_group_id = azurerm_network_security_group.main.id
}

# The actual VM
resource "azurerm_linux_virtual_machine" "rancher" {
  name                = "rancher-server"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  size                = var.vm_size                        # Standard_B2s (2 vCPU, 4 GB)
  admin_username      = var.admin_username

  network_interface_ids = [azurerm_network_interface.rancher.id]

  # SSH key authentication (no password)
  admin_ssh_key {
    username   = var.admin_username
    public_key = tls_private_key.ssh.public_key_openssh
  }

  # OS disk — the VM's hard drive
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"    # Standard HDD (cheapest). LRS = Locally Redundant Storage
    disk_size_gb         = 30
  }

  # Which OS to install — Ubuntu 22.04 LTS (most common for Docker/K8s)
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  zone = "2"

  tags = {
    role = "rancher"
  }
}


# ══════════════════════════════════════════════════════════
# VM 2: K8S WORKER NODE
# ══════════════════════════════════════════════════════════

resource "azurerm_public_ip" "k8s_node" {
  name                = "k8s-node-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "k8s_node" {
  name                = "k8s-node-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.k8s_node.id
  }
}

resource "azurerm_network_interface_security_group_association" "k8s_node" {
  network_interface_id      = azurerm_network_interface.k8s_node.id
  network_security_group_id = azurerm_network_security_group.main.id
}

resource "azurerm_linux_virtual_machine" "k8s_node" {
  name                = "k8s-node"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  size                = var.vm_size
  admin_username      = var.admin_username

  network_interface_ids = [azurerm_network_interface.k8s_node.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = tls_private_key.ssh.public_key_openssh
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  zone = "2"

  tags = {
    role = "k8s-node"
  }
}
